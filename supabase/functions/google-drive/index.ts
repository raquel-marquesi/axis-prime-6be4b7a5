import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface DriveFile {
  id?: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  description?: string;
}

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
// ID do Drive Compartilhado da Marquesi
const SHARED_DRIVE_ID = "0ABiR8Ngj0asyUk9PVA";

async function getAccessToken(credentials: ServiceAccountCredentials, userEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Fix private key newlines that may be escaped
  const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  
  const jwt = await new SignJWT({
    iss: credentials.client_email,
    sub: userEmail,
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    console.error("Token error:", tokenData);
    throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
}

async function listFiles(
  accessToken: string,
  query?: string,
  folderId?: string,
  maxResults = 50
): Promise<any[]> {
  const params = new URLSearchParams({
    pageSize: maxResults.toString(),
    fields: "files(id,name,mimeType,parents,createdTime,modifiedTime,size,webViewLink,iconLink)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "drive",
    driveId: SHARED_DRIVE_ID,
  });

  let q = "trashed = false";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  } else {
    // Se não especificar pasta, listar da raiz do drive compartilhado
    q += ` and '${SHARED_DRIVE_ID}' in parents`;
  }
  if (query) {
    q += ` and ${query}`;
  }
  params.append("q", q);

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("List files error:", data);
    throw new Error(`Failed to list files: ${data.error?.message || "Unknown error"}`);
  }

  return data.files || [];
}

async function getFile(accessToken: string, fileId: string): Promise<any> {
  const params = new URLSearchParams({
    fields: "id,name,mimeType,parents,createdTime,modifiedTime,size,webViewLink,iconLink,description",
    supportsAllDrives: "true",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Get file error:", data);
    throw new Error(`Failed to get file: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string,
  description?: string
): Promise<any> {
  const metadata: DriveFile = {
    name,
    mimeType: FOLDER_MIME_TYPE,
  };
  
  // Se não tiver parentId, usar o drive compartilhado como pai
  metadata.parents = [parentId || SHARED_DRIVE_ID];
  
  if (description) {
    metadata.description = description;
  }

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Create folder error:", data);
    throw new Error(`Failed to create folder: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function updateFile(
  accessToken: string,
  fileId: string,
  updates: { name?: string; description?: string }
): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Update file error:", data);
    throw new Error(`Failed to update file: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function moveFile(
  accessToken: string,
  fileId: string,
  newParentId: string
): Promise<any> {
  // First get current parents
  const file = await getFile(accessToken, fileId);
  const previousParents = file.parents?.join(",") || "";

  const params = new URLSearchParams({
    addParents: newParentId,
    removeParents: previousParents,
    fields: "id,name,parents",
    supportsAllDrives: "true",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?${params}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Move file error:", data);
    throw new Error(`Failed to move file: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 204) {
    const data = await response.json();
    console.error("Delete file error:", data);
    throw new Error(`Failed to delete file: ${data.error?.message || "Unknown error"}`);
  }
}

async function shareFile(
  accessToken: string,
  fileId: string,
  email: string,
  role: "reader" | "writer" | "commenter" = "reader"
): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "user",
        role,
        emailAddress: email,
      }),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Share file error:", data);
    throw new Error(`Failed to share file: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function searchFiles(accessToken: string, searchTerm: string, maxResults = 50): Promise<any[]> {
  const query = `name contains '${searchTerm}'`;
  return listFiles(accessToken, query, undefined, maxResults);
}

// Busca pastas por similaridade (name contains) dentro de um parent
function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function searchDriveFoldersByTerm(
  accessToken: string,
  term: string,
  parentId: string
): Promise<any[]> {
  const escapedTerm = term.replace(/'/g, "\\'");
  const params = new URLSearchParams({
    pageSize: "20",
    fields: "files(id,name,mimeType,webViewLink)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "drive",
    driveId: SHARED_DRIVE_ID,
    q: `name contains '${escapedTerm}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error("Find folder by similarity error:", data);
    throw new Error(`Failed to find folder by similarity: ${data.error?.message || "Unknown error"}`);
  }
  return data.files || [];
}

async function listAllFoldersInParent(
  accessToken: string,
  parentId: string
): Promise<any[]> {
  const allFolders: any[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      pageSize: "100",
      fields: "nextPageToken,files(id,name,mimeType,webViewLink)",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      corpora: "drive",
      driveId: SHARED_DRIVE_ID,
      q: `'${parentId}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
    });
    if (pageToken) params.append("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`List folders error: ${data.error?.message || "Unknown"}`);
    allFolders.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allFolders;
}

async function findFolderBySimilarity(
  accessToken: string,
  searchTerm: string,
  parentId?: string
): Promise<any[]> {
  const parent = parentId || SHARED_DRIVE_ID;

  // 1. Search with original term
  const results = await searchDriveFoldersByTerm(accessToken, searchTerm, parent);
  if (results.length > 0) return results;

  // 2. Fallback: search without accents
  const normalized = removeAccents(searchTerm);
  if (normalized !== searchTerm) {
    const fallback = await searchDriveFoldersByTerm(accessToken, normalized, parent);
    if (fallback.length > 0) return fallback;
  }

  // 3. Fallback: list ALL folders in parent and compare locally with normalization
  console.log(`findFolderBySimilarity: API search failed for "${searchTerm}", listing all folders in parent ${parent} for local comparison`);
  const allFolders = await listAllFoldersInParent(accessToken, parent);
  const normalizedTerm = removeAccents(searchTerm).toLowerCase();
  const matches = allFolders.filter(f => {
    const normalizedName = removeAccents(f.name).toLowerCase();
    return normalizedName.includes(normalizedTerm) || normalizedTerm.includes(normalizedName);
  });

  if (matches.length > 0) {
    console.log(`findFolderBySimilarity: local comparison found ${matches.length} match(es) for "${searchTerm}": ${matches.map((m: any) => m.name).join(", ")}`);
  }

  return matches;
}

// Busca uma pasta pelo nome exato dentro de um parent
async function findFolderByName(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<any | null> {
  const parent = parentId || SHARED_DRIVE_ID;
  const params = new URLSearchParams({
    pageSize: "1",
    fields: "files(id,name,mimeType,webViewLink)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "drive",
    driveId: SHARED_DRIVE_ID,
    q: `name = '${folderName.replace(/'/g, "\\'")}' and '${parent}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Find folder error:", data);
    throw new Error(`Failed to find folder: ${data.error?.message || "Unknown error"}`);
  }

  return data.files?.[0] || null;
}

// Encontra ou cria uma pasta
async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string,
  description?: string
): Promise<any> {
  // Primeiro tenta encontrar a pasta existente
  const existingFolder = await findFolderByName(accessToken, folderName, parentId);
  
  if (existingFolder) {
    console.log(`Folder found: ${existingFolder.name} (${existingFolder.id})`);
    return existingFolder;
  }
  
  // Se não existe, cria uma nova
  console.log(`Creating new folder: ${folderName}`);
  const newFolder = await createFolder(accessToken, folderName, parentId, description);
  return newFolder;
}

// Cria estrutura de pasta para processo (Cliente > Processo)
async function createProcessFolderStructure(
  accessToken: string,
  clientName: string,
  processNumber: string,
  folderNumber: number
): Promise<{ clientFolder: any; processFolder: any }> {
  // 1. Encontrar ou criar pasta do cliente
  const clientFolder = await findOrCreateFolder(
    accessToken, 
    clientName,
    SHARED_DRIVE_ID,
    `Pasta do cliente: ${clientName}`
  );
  
  // 2. Criar pasta do processo dentro da pasta do cliente
  const processFolderName = processNumber;
  const processFolder = await findOrCreateFolder(
    accessToken,
    processFolderName,
    clientFolder.id,
    `Processo: ${processNumber}`
  );
  
  return { clientFolder, processFolder };
}

// Cria estrutura completa de pastas para cliente (para o agente de monitoramento)
async function createClientFolderStructure(
  accessToken: string,
  clientName: string,
  parentId?: string
): Promise<{
  clientFolder: any;
  contratoFolder: any;
  faturamentoFolder: any;
  logsFolder: any;
  yearFolders: any[];
}> {
  const parent = parentId || SHARED_DRIVE_ID;
  
  // 1. Criar pasta principal do cliente
  const clientFolder = await findOrCreateFolder(
    accessToken,
    clientName,
    parent,
    `Cliente: ${clientName}`
  );

  // 2. Criar subpastas padrão
  const contratoFolder = await findOrCreateFolder(
    accessToken,
    "CONTRATO",
    clientFolder.id,
    "Contratos e aditivos"
  );

  // Criar subpasta de aditivos dentro de CONTRATO
  await findOrCreateFolder(accessToken, "aditivos", contratoFolder.id);

  const faturamentoFolder = await findOrCreateFolder(
    accessToken,
    "FATURAMENTO",
    clientFolder.id,
    "Arquivos de faturamento"
  );

  const logsFolder = await findOrCreateFolder(
    accessToken,
    "LOGS",
    clientFolder.id,
    "Logs de atividades e faturamento"
  );

  // 3. Criar pastas de anos (ano atual e próximo)
  const currentYear = new Date().getFullYear();
  const yearFolders: any[] = [];
  
  for (let year = currentYear; year <= currentYear + 1; year++) {
    const yearFolder = await findOrCreateFolder(
      accessToken,
      String(year),
      clientFolder.id,
      `Documentos de ${year}`
    );
    yearFolders.push(yearFolder);

    // Criar pastas de meses dentro do ano
    const months = [
      "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];

    for (const month of months) {
      await findOrCreateFolder(accessToken, month, yearFolder.id);
    }
  }

  return {
    clientFolder,
    contratoFolder,
    faturamentoFolder,
    logsFolder,
    yearFolders
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { 
      action, 
      userEmail, 
      fileId, 
      folderId, 
      name, 
      description,
      parentId,
      newParentId,
      query,
      searchTerm,
      email,
      role,
      maxResults,
      // Para criação de pasta de processo
      clientName,
      processNumber,
      folderNumber,
    } = await req.json();

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "userEmail is required for Domain-Wide Delegation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service account credentials
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    }

    console.log("Service Account JSON length:", serviceAccountJson.length);
    
    let credentials: ServiceAccountCredentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format");
    }

    if (!credentials.private_key) {
      console.error("Credentials keys:", Object.keys(credentials));
      throw new Error("private_key not found in service account JSON");
    }
    
    const accessToken = await getAccessToken(credentials, userEmail);

    console.log(`Drive action: ${action} for user: ${userEmail}`);

    let result: any;

    switch (action) {
      case "list": {
        const files = await listFiles(accessToken, query, folderId, maxResults || 50);
        result = { files, count: files.length };
        break;
      }

      case "get": {
        if (!fileId) {
          return new Response(JSON.stringify({ error: "fileId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await getFile(accessToken, fileId);
        break;
      }

      case "createFolder": {
        if (!name) {
          return new Response(JSON.stringify({ error: "name is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await createFolder(accessToken, name, parentId, description);
        break;
      }

      case "update": {
        if (!fileId) {
          return new Response(JSON.stringify({ error: "fileId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await updateFile(accessToken, fileId, { name, description });
        break;
      }

      case "move": {
        if (!fileId || !newParentId) {
          return new Response(JSON.stringify({ error: "fileId and newParentId are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await moveFile(accessToken, fileId, newParentId);
        break;
      }

      case "delete": {
        if (!fileId) {
          return new Response(JSON.stringify({ error: "fileId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await deleteFile(accessToken, fileId);
        result = { success: true, message: "File deleted" };
        break;
      }

      case "share": {
        if (!fileId || !email) {
          return new Response(JSON.stringify({ error: "fileId and email are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await shareFile(accessToken, fileId, email, role || "reader");
        break;
      }

      case "search": {
        if (!searchTerm) {
          return new Response(JSON.stringify({ error: "searchTerm is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const files = await searchFiles(accessToken, searchTerm, maxResults || 50);
        result = { files, count: files.length };
        break;
      }

      case "findOrCreateFolder": {
        if (!name) {
          return new Response(JSON.stringify({ error: "name is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await findOrCreateFolder(accessToken, name, parentId, description);
        break;
      }

      case "createProcessFolder": {
        if (!clientName || !processNumber || !folderNumber) {
          return new Response(JSON.stringify({ error: "clientName, processNumber, and folderNumber are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await createProcessFolderStructure(accessToken, clientName, processNumber, folderNumber);
        break;
      }

      case "createClientFolderStructure": {
        if (!clientName) {
          return new Response(JSON.stringify({ error: "clientName is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await createClientFolderStructure(accessToken, clientName, parentId);
        break;
      }

      case "findFolderBySimilarity": {
        if (!searchTerm) {
          return new Response(JSON.stringify({ error: "searchTerm is required for findFolderBySimilarity" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const folders = await findFolderBySimilarity(accessToken, searchTerm, parentId);
        result = { files: folders, count: folders.length };
        break;
      }

      default:
        return new Response(JSON.stringify({ 
          error: "Invalid action. Use: list, get, createFolder, findOrCreateFolder, createProcessFolder, createClientFolderStructure, findFolderBySimilarity, update, move, delete, share, search" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Drive function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

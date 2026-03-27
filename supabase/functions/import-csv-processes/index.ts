import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const SHARED_DRIVE_ID = "0ABiR8Ngj0asyUk9PVA";

// ---------- Google Drive helpers (inlined to avoid cross-function imports) ----------

async function getAccessToken(serviceAccountJson: string, userEmail: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountJson);
  const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  const now = Math.floor(Date.now() / 1000);

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
  if (!tokenResponse.ok) throw new Error(`Token error: ${tokenData.error_description || tokenData.error}`);
  return tokenData.access_token;
}

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function searchDriveFolders(
  accessToken: string,
  term: string,
  parentId: string
): Promise<any[]> {
  const escaped = term.replace(/'/g, "\\'");
  const params = new URLSearchParams({
    pageSize: "20",
    fields: "files(id,name,mimeType,webViewLink)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    corpora: "drive",
    driveId: SHARED_DRIVE_ID,
    q: `name contains '${escaped}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(`Drive search error: ${data.error?.message || "Unknown"}`);
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
  const results = await searchDriveFolders(accessToken, searchTerm, parent);
  if (results.length > 0) return results;

  // 2. Fallback: search without accents
  const normalized = removeAccents(searchTerm);
  if (normalized !== searchTerm) {
    const fallback = await searchDriveFolders(accessToken, normalized, parent);
    if (fallback.length > 0) return fallback;
  }

  // 3. Fallback: list ALL folders in parent and compare locally with normalization
  console.log(`findFolderBySimilarity: API search failed for "${searchTerm}", listing all folders for local comparison`);
  const allFolders = await listAllFoldersInParent(accessToken, parent);
  const normalizedTerm = removeAccents(searchTerm).toLowerCase();
  const matches = allFolders.filter(f => {
    const normalizedName = removeAccents(f.name).toLowerCase();
    return normalizedName.includes(normalizedTerm) || normalizedTerm.includes(normalizedName);
  });

  if (matches.length > 0) {
    console.log(`findFolderBySimilarity: local match found for "${searchTerm}": ${matches.map((m: any) => m.name).join(", ")}`);
  }

  return matches;
}

async function getFileParents(accessToken: string, fileId: string): Promise<string[]> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Get parents error: ${data.error?.message || "Unknown"}`);
  return data.parents || [];
}

async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<any> {
  const metadata: any = {
    name,
    mimeType: FOLDER_MIME_TYPE,
    parents: [parentId || SHARED_DRIVE_ID],
  };

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
  if (!response.ok) throw new Error(`Create folder error: ${data.error?.message || "Unknown"}`);
  return data;
}

// ---------- DB helpers ----------

function isValidProcessNumber(num: string): boolean {
  if (!num || num === "N/I") return false;
  // Check for all-zeros placeholder
  if (/^0{5,}/.test(num.replace(/[^0-9]/g, ""))) return false;
  return num.length >= 10;
}

function mapArea(areaStr: string): "trabalhista" | "civel" {
  const lower = (areaStr || "").toLowerCase();
  if (lower.includes("civ") || lower.includes("cív")) return "civel";
  return "trabalhista";
}

function mapTipoAcao(acaoStr: string): string {
  const lower = (acaoStr || "").toLowerCase();
  if (lower.includes("coletiva") || lower.includes("acao civil") || lower.includes("ação civil")) return "coletiva";
  return "individual";
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  if (!str) return null;
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return null;
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");

    const body = await req.json();
    const { rows, userEmail, clientMapping } = body;

    if (!rows || !Array.isArray(rows) || !userEmail) {
      return new Response(JSON.stringify({ error: "rows[] and userEmail are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`import-csv-processes: processing ${rows.length} rows`);

    // Get Drive access token once for the whole batch
    const accessToken = await getAccessToken(serviceAccountJson, userEmail);

    // Cache for resolved clients and their Drive folder IDs
    const clientCache: Record<string, { id: string; nome_fantasia: string; driveFolderId: string | null }> = {};

    let created_processes = 0;
    let skipped_duplicates = 0;
    let folders_created = 0;
    let folders_reused = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Processo #${i + 1}`;

      try {
        const numeroProcesso = String(row["Nro. Processo"] || row.numero_processo || "").trim();
        const parteContraria = String(row["Parte Contraria"] || row["Parte Contrária"] || row.reclamante_nome || "").trim();
        const partePrincipal = String(row["Parte Principal"] || "").trim();
        const clienteNome = String(row["Cliente"] || row.cliente || "").trim();
        const area = String(row["Area"] || row["Área"] || row.area || "").trim();
        const acao = String(row["Acao"] || row["Ação"] || row.tipo_acao || "").trim();
        const codigoExterno = String(row["Codigo"] || row["Código"] || row.codigo_externo || "").trim();
        const incluidoPor = String(row["Incluido por"] || row["Incluído por"] || "").trim();
        const dataInclusao = parseDate(row["Data Inclusao"] || row["Data Inclusão"] || row.data_inclusao);

        if (!parteContraria && !numeroProcesso) {
          errors.push(`${rowLabel}: sem numero_processo e sem parte_contraria`);
          continue;
        }

        const validNumber = isValidProcessNumber(numeroProcesso);

        // --- Dedup check ---
        if (validNumber) {
          const { data: existing } = await supabase
            .from("processes").select("id")
            .eq("numero_processo", numeroProcesso).limit(1).single();
          if (existing) {
            skipped_duplicates++;
            continue;
          }
        } else if (codigoExterno) {
          const { data: existing } = await supabase
            .from("processes").select("id")
            .eq("codigo_externo", codigoExterno).limit(1).single();
          if (existing) {
            skipped_duplicates++;
            continue;
          }
        }

        // --- Resolve client ---
        let clientInfo = clientCache[clienteNome];
        if (!clientInfo) {
          let clientId: string | null = null;
          let nomeFantasia = clienteNome;

          // If clientMapping is provided, use it directly
          if (clientMapping && clientMapping[clienteNome]) {
            clientId = clientMapping[clienteNome];
            const { data: clientData } = await supabase
              .from("clients").select("id, nome_fantasia")
              .eq("id", clientId).single();
            if (clientData) {
              nomeFantasia = clientData.nome_fantasia || clienteNome;
            }
          } else {
            // Fallback: Try partial match on nome_fantasia
            const parts = clienteNome.split(" - ");
            const searchTerms = parts.length > 1 ? [clienteNome, ...parts] : [clienteNome];

            for (const term of searchTerms) {
              const { data: found } = await supabase
                .from("clients").select("id, nome_fantasia")
                .ilike("nome_fantasia", `%${term.trim()}%`)
                .eq("is_active", true).limit(1).single();
              if (found) {
                clientId = found.id;
                nomeFantasia = found.nome_fantasia || term;
                break;
              }
            }
          }

          if (!clientId) {
            errors.push(`${rowLabel}: cliente "${clienteNome}" nao encontrado`);
            continue;
          }

          clientInfo = { id: clientId, nome_fantasia: nomeFantasia, driveFolderId: null };
          clientCache[clienteNome] = clientInfo;
        }

        // --- Resolve user (sigla) ---
        let createdBy: string | null = null;
        if (incluidoPor) {
          const { data: profile } = await supabase
            .from("profiles").select("user_id")
            .eq("sigla", incluidoPor.toUpperCase())
            .eq("is_active", true).limit(1).single();
          createdBy = profile?.user_id || null;
        }

        // --- Insert process ---
        const processData: any = {
          numero_processo: validNumber ? numeroProcesso : (numeroProcesso || "N/I"),
          id_cliente: clientInfo.id,
          reclamante_nome: parteContraria || "N/A",
          reclamadas: partePrincipal ? [partePrincipal] : [],
          area: mapArea(area),
          tipo_acao: mapTipoAcao(acao),
          codigo_externo: codigoExterno || null,
          created_by: createdBy,
        };
        if (dataInclusao) {
          processData.created_at = new Date(dataInclusao + "T00:00:00Z").toISOString();
        }

        const { data: newProcess, error: procErr } = await supabase
          .from("processes").insert(processData).select("id, numero_pasta").single();

        if (procErr) {
          errors.push(`${rowLabel}: erro ao inserir: ${procErr.message}`);
          continue;
        }

        created_processes++;

        // --- Drive folder creation ---
        try {
          // 1. Find or get client folder by similarity
          if (!clientInfo.driveFolderId) {
            const clientFolders = await findFolderBySimilarity(accessToken, clientInfo.nome_fantasia);
            if (clientFolders.length > 0) {
              clientInfo.driveFolderId = clientFolders[0].id;
              console.log(`Reusing client folder: ${clientFolders[0].name} (${clientFolders[0].id})`);
              folders_reused++;
            } else {
              // REVERSE SEARCH: try to find the process folder globally to discover client folder
              const reverseIdentifier = validNumber ? numeroProcesso : parteContraria;
              let foundViaReverse = false;

              if (reverseIdentifier) {
                console.log(`Reverse search: looking for process folder "${reverseIdentifier}" in entire shared drive`);
                const globalProcessFolders = await findFolderBySimilarity(accessToken, reverseIdentifier);
                if (globalProcessFolders.length > 0) {
                  const parents = await getFileParents(accessToken, globalProcessFolders[0].id);
                  if (parents.length > 0 && parents[0] !== SHARED_DRIVE_ID) {
                    clientInfo.driveFolderId = parents[0];
                    console.log(`Reverse search SUCCESS: process folder "${globalProcessFolders[0].name}" found, using parent ${parents[0]} as client folder`);
                    folders_reused++;
                    clientCache[clienteNome] = clientInfo;

                    // Process folder already exists, update and continue
                    await supabase.from("processes")
                      .update({ drive_folder_id: globalProcessFolders[0].id })
                      .eq("id", newProcess.id);
                    folders_reused++;
                    foundViaReverse = true;
                  }
                }
              }

              if (foundViaReverse) continue; // skip to next row

              // Nothing worked, create new client folder
              const newFolder = await createDriveFolder(accessToken, clientInfo.nome_fantasia);
              clientInfo.driveFolderId = newFolder.id;
              console.log(`Created client folder: ${clientInfo.nome_fantasia} (${newFolder.id})`);
              folders_created++;
            }
            clientCache[clienteNome] = clientInfo;
          }

          // 2. Find or create process folder
          const searchIdentifier = validNumber ? numeroProcesso : parteContraria;
          if (!searchIdentifier) {
            continue; // Can't create folder without identifier
          }

          const processFolders = await findFolderBySimilarity(
            accessToken,
            searchIdentifier,
            clientInfo.driveFolderId!
          );

          let processFolderId: string;
          if (processFolders.length > 0) {
            processFolderId = processFolders[0].id;
            console.log(`Reusing process folder: ${processFolders[0].name}`);
            folders_reused++;
          } else {
            const folderName = validNumber ? numeroProcesso : parteContraria;
            const newFolder = await createDriveFolder(
              accessToken,
              folderName,
              clientInfo.driveFolderId!
            );
            processFolderId = newFolder.id;
            console.log(`Created process folder: ${folderName}`);
            folders_created++;
          }

          // Update process with drive_folder_id
          await supabase.from("processes")
            .update({ drive_folder_id: processFolderId })
            .eq("id", newProcess.id);

        } catch (driveErr: any) {
          errors.push(`${rowLabel}: processo criado mas erro no Drive: ${driveErr.message}`);
        }

      } catch (e: any) {
        errors.push(`${rowLabel}: ${e.message}`);
      }
    }

    const result = {
      status: "ok",
      created_processes,
      skipped_duplicates,
      folders_created,
      folders_reused,
      errors,
    };

    console.log(`import-csv-processes done:`, JSON.stringify({ ...result, errors: result.errors.length }));

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("import-csv-processes error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

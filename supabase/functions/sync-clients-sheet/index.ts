import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SPREADSHEET_ID = "1TASkQ1j_DC4Ajd3pSzbaDSmKux2lFKzyxeEpBrI5B1Q";

// ─── Google Auth (copied from sync-sheets) ─────────────────────────

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );

  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = base64url(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(`${header}.${payload}`)
    )
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${sig}`,
  });
  const data = await res.json();
  if (!data.access_token)
    throw new Error("Failed to get Google access token: " + JSON.stringify(data));
  return data.access_token;
}

// ─── Sheets helpers ────────────────────────────────────────────────

async function getSheetNames(accessToken: string, spreadsheetId: string): Promise<{ title: string; sheetId: number }[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets metadata error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.sheets || []).map((s: any) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }));
}

async function readSheet(accessToken: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheets API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.values || [];
}

// ─── Header mapping ────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

interface HeaderMap {
  [key: string]: number;
}

function mapHeaders(headers: string[]): HeaderMap {
  const map: HeaderMap = {};
  const aliases: Record<string, string[]> = {
    razao_social: ["razao social", "razão social", "nome/razao social", "nome / razao social"],
    nome_fantasia: ["nome fantasia", "nome chave", "nome-chave", "nomechave"],
    cnpj: ["cnpj", "documento (cpf/cnpj)", "cpf/cnpj", "documento"],
    cpf: ["cpf"],
    centro_custo: ["centro de custo", "centro custo", "cc"],
    filial: ["filial", "unidade"],
    grupo_economico: ["grupo economico", "grupo econômico", "grupo"],
    contrato_chave: ["contrato-chave", "contrato chave", "contrato"],
    contrato_objeto: ["objeto do contrato", "objeto contrato", "objeto"],
    contrato_data_inicio: ["data inicio contrato", "inicio contrato", "vigencia inicio", "data inicio"],
    contrato_data_vencimento: ["data vencimento contrato", "vencimento contrato", "vigencia fim", "data vencimento", "vencimento"],
    contrato_condicoes_faturamento: ["condicoes faturamento", "condicoes de faturamento", "faturamento"],
    contato_nome: ["contato", "nome contato", "nome do contato"],
    contato_email: ["email", "e-mail", "email contato"],
    contato_telefone: ["telefone", "tel", "telefone contato"],
    contato_celular: ["celular", "cel", "celular contato"],
    contato_cargo: ["cargo", "cargo contato"],
    endereco: ["endereco", "endereço", "logradouro"],
    cidade: ["cidade"],
    estado: ["estado", "uf"],
    cep: ["cep"],
    bairro: ["bairro"],
    representante_legal: ["representante legal", "representante"],
    observacoes: ["observacoes", "observações", "obs"],
    valor: ["valor", "valor contrato", "valor do contrato"],
    status: ["status", "status (aceita/negociação)", "status (aceita/negociacao)"],
    data_recebimento: ["data do recebimento", "data recebimento", "data"],
    link_email: ["link do email", "link email"],
    metodo_pagamento: ["metodo pagamento", "método de pagamento", "forma pagamento"],
    indicacao_por: ["indicacao", "indicação", "indicado por"],
  };

  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    if (!norm) return;
    for (const [field, aliasList] of Object.entries(aliases)) {
      if (aliasList.some((a) => norm === a || norm.includes(a))) {
        if (!(field in map)) map[field] = idx;
        break;
      }
    }
  });

  return map;
}

function getVal(row: string[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return (row[idx] || "").trim();
}

// ─── Helpers ───────────────────────────────────────────────────────

function cleanDoc(doc: string): string {
  return doc.replace(/[.\-\/\s]/g, "");
}

function isValidCnpj(doc: string): boolean {
  return cleanDoc(doc).length === 14;
}

function isValidCpf(doc: string): boolean {
  return cleanDoc(doc).length === 11;
}

function parseDate(str: string): string | null {
  if (!str) return null;
  // Try dd/mm/yyyy
  const parts = str.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

// ─── Main handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: claimsError } = await anonClient.auth.getUser(token);
    if (claimsError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create sync log
    const { data: logRow } = await supabase
      .from("sync_logs")
      .insert({ sheet_type: "clients", status: "running" })
      .select("id")
      .single();
    const logId = logRow?.id;

    const saJson = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || "{}");
    const accessToken = await getGoogleAccessToken(saJson);

    // Discover sheets
    const sheets = await getSheetNames(accessToken, SPREADSHEET_ID);
    console.log("[sync-clients] Sheets found:", sheets.map((s) => s.title));

    // Try to find best sheet – prefer sheet with gid 779538668 or a name containing "contrato"/"cliente"/"cadastro"
    const TARGET_GID = 779538668;
    let targetSheet = sheets.find((s) => s.sheetId === TARGET_GID);
    if (!targetSheet) {
      targetSheet = sheets.find((s) => {
        const n = s.title.toLowerCase();
        return n.includes("contrato") || n.includes("cliente") || n.includes("cadastro");
      });
    }
    if (!targetSheet && sheets.length > 0) {
      targetSheet = sheets[0];
    }
    if (!targetSheet) throw new Error("Nenhuma aba encontrada na planilha");

    console.log(`[sync-clients] Using sheet: "${targetSheet.title}"`);

    // Read all data
    const allData = await readSheet(accessToken, SPREADSHEET_ID, `'${targetSheet.title}'!A1:AZ`);
    if (allData.length < 2) {
      await supabase.from("sync_logs").update({
        status: "completed",
        finished_at: new Date().toISOString(),
        rows_found: 0,
        rows_processed: 0,
        details: { message: "Planilha vazia ou sem dados" },
      }).eq("id", logId);
      return new Response(JSON.stringify({ message: "Planilha vazia", created: 0, updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = allData[0];
    const rows = allData.slice(1).filter((r) => r.some((c) => c?.trim()));
    const hmap = mapHeaders(headers);

    console.log("[sync-clients] Headers:", headers);
    console.log("[sync-clients] Mapped fields:", Object.keys(hmap));
    console.log("[sync-clients] Rows to process:", rows.length);

    // Pre-fetch branches and economic groups for matching
    const { data: existingBranches } = await supabase.from("branches").select("id, nome");
    const { data: existingGroups } = await supabase.from("economic_groups").select("id, nome");
    const { data: existingContractKeys } = await supabase.from("contract_keys").select("id, nome");

    const branchMap = new Map((existingBranches || []).map((b) => [b.nome.toUpperCase(), b.id]));
    const groupMap = new Map((existingGroups || []).map((g) => [g.nome.toUpperCase(), g.id]));
    const contractKeyMap = new Map((existingContractKeys || []).map((ck) => [ck.nome.toUpperCase(), ck.id]));

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header

      try {
        const rawDoc = getVal(row, hmap.cnpj) || getVal(row, hmap.cpf);
        const doc = cleanDoc(rawDoc);
        const razaoSocial = getVal(row, hmap.razao_social);
        const nomeFantasia = getVal(row, hmap.nome_fantasia);

        if (!doc && !razaoSocial) {
          // Skip empty rows
          continue;
        }

        // Determine PF/PJ
        let tipo: "fisica" | "juridica" = "juridica";
        let cnpj: string | null = null;
        let cpf: string | null = null;

        if (doc) {
          if (isValidCnpj(doc)) {
            tipo = "juridica";
            cnpj = doc;
          } else if (isValidCpf(doc)) {
            tipo = "fisica";
            cpf = doc;
          } else {
            // Try to use as-is; assume PJ if longer
            if (doc.length > 11) {
              cnpj = doc;
            } else {
              cpf = doc;
              tipo = "fisica";
            }
          }
        }

        // Search for existing client by document
        let existingClient = null;
        if (cnpj) {
          const { data } = await supabase.from("clients").select("id").eq("cnpj", cnpj).maybeSingle();
          existingClient = data;
        }
        if (!existingClient && cpf) {
          const { data } = await supabase.from("clients").select("id").eq("cpf", cpf).maybeSingle();
          existingClient = data;
        }

        // Resolve branch
        let branchId: string | null = null;
        const filialNome = getVal(row, hmap.filial).toUpperCase();
        if (filialNome) {
          branchId = branchMap.get(filialNome) || null;
          if (!branchId) {
            const { data: newBranch } = await supabase
              .from("branches")
              .insert({ nome: filialNome })
              .select("id")
              .single();
            if (newBranch) {
              branchId = newBranch.id;
              branchMap.set(filialNome, branchId);
            }
          }
        }

        // Resolve economic group
        let economicGroupId: string | null = null;
        const grupoNome = getVal(row, hmap.grupo_economico).toUpperCase();
        if (grupoNome) {
          economicGroupId = groupMap.get(grupoNome) || null;
          if (!economicGroupId) {
            const { data: newGroup } = await supabase
              .from("economic_groups")
              .insert({ nome: grupoNome })
              .select("id")
              .single();
            if (newGroup) {
              economicGroupId = newGroup.id;
              groupMap.set(grupoNome, economicGroupId);
            }
          }
        }

        // Resolve contract key
        let contractKeyId: string | null = null;
        const contratoNome = getVal(row, hmap.contrato_chave).toUpperCase();
        if (contratoNome) {
          contractKeyId = contractKeyMap.get(contratoNome) || null;
          if (!contractKeyId) {
            const { data: newCk } = await supabase
              .from("contract_keys")
              .insert({ nome: contratoNome, economic_group_id: economicGroupId })
              .select("id")
              .single();
            if (newCk) {
              contractKeyId = newCk.id;
              contractKeyMap.set(contratoNome, contractKeyId);
            }
          }
        }

        // Build client record
        const clientData: Record<string, any> = {
          tipo,
          tipo_cadastro: "cliente" as const,
          is_active: true,
        };

        if (cnpj) clientData.cnpj = cnpj;
        if (cpf) clientData.cpf = cpf;
        if (razaoSocial) clientData.razao_social = razaoSocial;
        if (nomeFantasia) clientData.nome_fantasia = nomeFantasia;
        if (!clientData.nome) clientData.nome = nomeFantasia || razaoSocial;
        if (economicGroupId) clientData.economic_group_id = economicGroupId;
        if (contractKeyId) clientData.contract_key_id = contractKeyId;

        // Contract fields
        const contratoObjeto = getVal(row, hmap.contrato_objeto);
        if (contratoObjeto) clientData.contrato_objeto = contratoObjeto;

        const contratoInicio = parseDate(getVal(row, hmap.contrato_data_inicio));
        if (contratoInicio) clientData.contrato_data_inicio = contratoInicio;

        const contratoVencimento = parseDate(getVal(row, hmap.contrato_data_vencimento));
        if (contratoVencimento) clientData.contrato_data_vencimento = contratoVencimento;

        const condicoesFat = getVal(row, hmap.contrato_condicoes_faturamento);
        if (condicoesFat) clientData.contrato_condicoes_faturamento = condicoesFat;

        // Address
        const endereco = getVal(row, hmap.endereco);
        if (endereco) clientData.logradouro = endereco;
        const cidade = getVal(row, hmap.cidade);
        if (cidade) clientData.cidade = cidade;
        const estado = getVal(row, hmap.estado);
        if (estado) clientData.estado = estado;
        const cep = getVal(row, hmap.cep);
        if (cep) clientData.cep = cep;
        const bairro = getVal(row, hmap.bairro);
        if (bairro) clientData.bairro = bairro;

        // Other fields
        const centroCusto = getVal(row, hmap.centro_custo);
        if (centroCusto) clientData.centro_custo = centroCusto;

        const representante = getVal(row, hmap.representante_legal);
        if (representante) clientData.representante_legal = representante;

        const obs = getVal(row, hmap.observacoes);
        if (obs) clientData.observacoes = obs;

        const metodoPgto = getVal(row, hmap.metodo_pagamento);
        if (metodoPgto) clientData.metodo_pagamento = metodoPgto;

        let clientId: string;

        if (existingClient) {
          // Update existing
          const { error: updateError } = await supabase
            .from("clients")
            .update({ ...clientData, updated_at: new Date().toISOString() })
            .eq("id", existingClient.id);
          if (updateError) throw updateError;
          clientId = existingClient.id;
          updated++;
        } else {
          // Create new
          const { data: newClient, error: insertError } = await supabase
            .from("clients")
            .insert(clientData)
            .select("id")
            .single();
          if (insertError) throw insertError;
          clientId = newClient!.id;
          created++;
        }

        // Link branch via client_branches (if not already linked)
        if (branchId && clientId) {
          await supabase
            .from("client_branches")
            .upsert({ client_id: clientId, branch_id: branchId }, { onConflict: "client_id,branch_id" })
            .select();
        }

        // Create/update contact if contact info present
        const contatoNome = getVal(row, hmap.contato_nome);
        const contatoEmail = getVal(row, hmap.contato_email);
        const contatoTelefone = getVal(row, hmap.contato_telefone);
        const contatoCelular = getVal(row, hmap.contato_celular);
        const contatoCargo = getVal(row, hmap.contato_cargo);

        if (contatoNome || contatoEmail) {
          const contactData: Record<string, any> = {
            client_id: clientId,
            nome: contatoNome || "Contato Principal",
            tipo: "principal",
          };
          if (contatoEmail) contactData.email = contatoEmail;
          if (contatoTelefone) contactData.telefone = contatoTelefone;
          if (contatoCelular) contactData.celular = contatoCelular;
          if (contatoCargo) contactData.cargo = contatoCargo;

          // Check if contact already exists for this client
          const { data: existingContacts } = await supabase
            .from("client_contacts")
            .select("id")
            .eq("client_id", clientId)
            .eq("tipo", "principal")
            .limit(1);

          if (existingContacts && existingContacts.length > 0) {
            await supabase
              .from("client_contacts")
              .update({ ...contactData, updated_at: new Date().toISOString() })
              .eq("id", existingContacts[0].id);
          } else {
            await supabase.from("client_contacts").insert(contactData);
          }
        }
      } catch (err: any) {
        failed++;
        const msg = `Linha ${rowNum}: ${err.message || JSON.stringify(err)}`;
        errors.push(msg);
        console.error(`[sync-clients] ${msg}`);
      }
    }

    // Update sync log
    await supabase.from("sync_logs").update({
      status: failed > 0 ? "completed_with_errors" : "completed",
      finished_at: new Date().toISOString(),
      rows_found: rows.length,
      rows_processed: created + updated,
      rows_failed: failed,
      details: { errors: errors.slice(0, 50), created, updated },
    }).eq("id", logId);

    const result = { message: `Sincronização concluída`, created, updated, failed, errors: errors.slice(0, 10) };
    console.log("[sync-clients] Result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[sync-clients] Fatal error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

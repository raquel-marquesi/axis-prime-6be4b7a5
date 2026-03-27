import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactRecord {
  nome: string;
  email?: string;
  telefone?: string;
  tipo?: string;
}

interface ClientRecord {
  razao_social?: string;
  nome?: string;
  cnpj?: string;
  cpf?: string;
  tipo: "fisica" | "juridica";
  grupo_economico?: string;
  contrato?: string;
  filial?: string;
  nome_fantasia?: string;
  centro_custo?: string;
  contacts?: ContactRecord[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { clients } = (await req.json()) as { clients: ClientRecord[] };

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No clients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Collect unique groups and contracts
    const groupNames = [...new Set(clients.map((c) => c.grupo_economico).filter(Boolean))] as string[];
    const contractNames = [...new Set(clients.map((c) => c.contrato).filter(Boolean))] as string[];

    // 2. Upsert economic groups
    const groupMap: Record<string, string> = {};
    for (const nome of groupNames) {
      const { data: existing } = await supabase
        .from("economic_groups")
        .select("id")
        .eq("nome", nome)
        .maybeSingle();

      if (existing) {
        groupMap[nome] = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("economic_groups")
          .insert({ nome })
          .select("id")
          .single();
        if (error) throw error;
        groupMap[nome] = created.id;
      }
    }

    // 3. Upsert contract keys with group linkage
    const contractGroupMapping: Record<string, string> = {
      SEB: "SEB",
      BRADESCO: "BRADESCO",
      BOTICARIO: "BOTICÁRIO",
      SEVILHA: "CALZEDONIA",
      CBA: "CBA",
    };

    const contractMap: Record<string, string> = {};
    for (const nome of contractNames) {
      const { data: existing } = await supabase
        .from("contract_keys")
        .select("id")
        .eq("nome", nome)
        .maybeSingle();

      if (existing) {
        contractMap[nome] = existing.id;
      } else {
        const linkedGroup = contractGroupMapping[nome];
        const economic_group_id = linkedGroup ? groupMap[linkedGroup] || null : null;

        const { data: created, error } = await supabase
          .from("contract_keys")
          .insert({ nome, economic_group_id })
          .select("id")
          .single();
        if (error) throw error;
        contractMap[nome] = created.id;
      }
    }

    // 4. Fetch branches for matching (with alias support)
    const branchAliases: Record<string, string> = {
      "LOMA PATRICIA": "PATRICIA LOMA",
      "PATRICIA LOMA CONSULTORIA": "PATRICIA LOMA",
    };
    const { data: branches } = await supabase.from("branches").select("id, nome");
    const branchMap: Record<string, string> = {};
    for (const b of branches || []) {
      branchMap[b.nome.toUpperCase()] = b.id;
    }

    // 5. Process clients (upsert mode)
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const c of clients) {
      try {
        const doc = c.tipo === "fisica" ? c.cpf?.replace(/\D/g, "") : c.cnpj?.replace(/\D/g, "");
        const docField = c.tipo === "fisica" ? "cpf" : "cnpj";

        // Check if client exists
        let existingClient: { id: string } | null = null;
        if (doc) {
          const { data: dup } = await supabase
            .from("clients")
            .select("id")
            .eq(docField, doc)
            .maybeSingle();
          existingClient = dup;
        }

        let clientId: string;

        if (existingClient) {
          // UPDATE existing client
          const updateData: Record<string, unknown> = {};
          if (c.nome_fantasia) updateData.nome_fantasia = c.nome_fantasia;
          if (c.grupo_economico && groupMap[c.grupo_economico]) {
            updateData.economic_group_id = groupMap[c.grupo_economico];
          }
          if (c.contrato && contractMap[c.contrato]) {
            updateData.contract_key_id = contractMap[c.contrato];
          }

          if (Object.keys(updateData).length > 0) {
            await supabase.from("clients").update(updateData).eq("id", existingClient.id);
          }

          clientId = existingClient.id;
          updated++;
        } else {
          // INSERT new client
          const clientData: Record<string, unknown> = {
            tipo: c.tipo,
            tipo_cadastro: "cliente",
            is_active: true,
          };

          if (c.tipo === "fisica") {
            clientData.nome = c.nome || c.razao_social;
            if (doc) clientData.cpf = doc;
          } else {
            clientData.razao_social = c.razao_social || c.nome_fantasia;
            if (doc) clientData.cnpj = doc;
            if (c.nome_fantasia) clientData.nome_fantasia = c.nome_fantasia;
          }

          if (c.centro_custo) clientData.centro_custo = c.centro_custo;
          if (c.grupo_economico && groupMap[c.grupo_economico]) {
            clientData.economic_group_id = groupMap[c.grupo_economico];
          }
          if (c.contrato && contractMap[c.contrato]) {
            clientData.contract_key_id = contractMap[c.contrato];
          }

          const { data: newClient, error: insertErr } = await supabase
            .from("clients")
            .insert(clientData)
            .select("id")
            .single();

          if (insertErr) throw insertErr;
          clientId = newClient.id;
          created++;
        }

        // Link branches (supports multiple via pipe separator)
        if (c.filial) {
          const filiais = c.filial.split("|").map((f) => f.trim());
          for (const filialName of filiais) {
            const normalizedFilial = filialName.toUpperCase();
            const resolvedFilial = branchAliases[normalizedFilial] || normalizedFilial;
            const branchId = branchMap[resolvedFilial];
            if (branchId) {
              // Check if link already exists
              const { data: existingLink } = await supabase
                .from("client_branches")
                .select("client_id")
                .eq("client_id", clientId)
                .eq("branch_id", branchId)
                .maybeSingle();

              if (!existingLink) {
                await supabase
                  .from("client_branches")
                  .insert({ client_id: clientId, branch_id: branchId });
              }
            }
          }
        }

        // Create contacts if provided
        if (c.contacts && c.contacts.length > 0) {
          for (const contact of c.contacts) {
            if (!contact.nome) continue;
            // Check if contact already exists for this client
            const { data: existingContact } = await supabase
              .from("client_contacts")
              .select("id")
              .eq("client_id", clientId)
              .eq("nome", contact.nome)
              .maybeSingle();

            if (!existingContact) {
              await supabase.from("client_contacts").insert({
                client_id: clientId,
                nome: contact.nome,
                email: contact.email || null,
                telefone: contact.telefone || null,
                tipo: contact.tipo || "principal",
              });
            }
          }
        }
      } catch (err: unknown) {
        const name = c.razao_social || c.nome || c.nome_fantasia || "Unknown";
        errors.push(`${name}: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: clients.length, created, updated, skipped, errors: errors.length },
        errors: errors.slice(0, 20),
        groups_created: groupNames.length,
        contracts_created: contractNames.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

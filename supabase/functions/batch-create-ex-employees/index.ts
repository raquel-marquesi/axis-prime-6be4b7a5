import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { names } = (await req.json()) as { names: string[] };
    if (!names || !Array.isArray(names) || names.length === 0) {
      return new Response(JSON.stringify({ error: "Missing names array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { name: string; status: string; error?: string }[] = [];

    for (const rawName of names) {
      const fullName = rawName.trim().toUpperCase();
      if (!fullName) continue;

      try {
        // Check if profile already exists by name
        const { data: existing } = await adminClient
          .from("profiles")
          .select("id")
          .eq("full_name", fullName)
          .limit(1);

        if (existing && existing.length > 0) {
          results.push({ name: fullName, status: "skipped", error: "Already exists" });
          continue;
        }

        // Generate deterministic fake email
        const slug = fullName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .substring(0, 40);
        const fakeEmail = `ex_${slug}_${crypto.randomUUID().slice(0, 6)}@inactive.local`;

        // Create banned auth user
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: fakeEmail,
          email_confirm: true,
          password: crypto.randomUUID(),
          ban_duration: "876600h",
          user_metadata: { full_name: fullName, is_ex_employee: true },
        });

        if (authError) throw authError;

        const userId = authUser.user.id;

        // Create profile
        const { error: profileError } = await adminClient.from("profiles").insert({
          user_id: userId,
          full_name: fullName,
          email: fakeEmail,
          is_active: false,
        });
        if (profileError) throw profileError;

        // Assign calculista role
        const { error: roleError } = await adminClient.from("user_roles").insert({
          user_id: userId,
          role: "calculista",
        });
        if (roleError) throw roleError;

        results.push({ name: fullName, status: "created" });
      } catch (err: any) {
        results.push({ name: fullName, status: "error", error: err.message });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({ summary: { total: names.length, created, skipped, errors }, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

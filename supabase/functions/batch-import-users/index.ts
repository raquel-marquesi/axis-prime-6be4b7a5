import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserImport {
  fullName: string;
  email: string;
  sigla: string;
  role: string;
  coordinatorName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const callerId = caller.id;
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can import users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { users } = (await req.json()) as { users: UserImport[] };
    if (!users || !Array.isArray(users)) {
      return new Response(JSON.stringify({ error: "Missing users array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-fetch all profiles to resolve coordinator names
    const { data: allProfiles } = await adminClient.from("profiles").select("id, full_name");
    const profileByName = new Map<string, string>();
    for (const p of allProfiles || []) {
      profileByName.set(p.full_name.toUpperCase().trim(), p.id);
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const u of users) {
      try {
        // Check if user already exists by email
        const { data: existingProfiles } = await adminClient
          .from("profiles")
          .select("id")
          .eq("email", u.email.toLowerCase().trim())
          .limit(1);

        if (existingProfiles && existingProfiles.length > 0) {
          results.push({ email: u.email, status: "skipped", error: "Already exists" });
          continue;
        }

        // Create auth user (no email sent)
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: u.email.toLowerCase().trim(),
          email_confirm: true,
          password: crypto.randomUUID().slice(0, 16),
          user_metadata: { full_name: u.fullName },
        });

        if (authError) {
          // If user already exists in auth but not in profiles
          if (authError.message?.includes("already been registered")) {
            results.push({ email: u.email, status: "skipped", error: "Auth user exists" });
            continue;
          }
          throw authError;
        }

        const userId = authUser.user.id;

        // Resolve coordinator
        let reportsTo: string | null = null;
        if (u.coordinatorName) {
          const coordKey = u.coordinatorName.toUpperCase().trim();
          // Try exact match first, then partial
          reportsTo = profileByName.get(coordKey) || null;
          if (!reportsTo) {
            // Try partial match
            for (const [name, id] of profileByName.entries()) {
              if (name.includes(coordKey) || coordKey.includes(name)) {
                reportsTo = id;
                break;
              }
            }
          }
        }

        // Create profile
        const { data: newProfile, error: profileError } = await adminClient.from("profiles").insert({
          user_id: userId,
          full_name: u.fullName,
          email: u.email.toLowerCase().trim(),
          sigla: u.sigla || null,
          reports_to: reportsTo,
          is_active: true,
        }).select("id, full_name").single();

        if (profileError) throw profileError;

        // Update the local map so subsequent users can reference this coordinator
        if (newProfile) {
          profileByName.set(newProfile.full_name.toUpperCase().trim(), newProfile.id);
        }

        // Assign role
        const { error: roleError } = await adminClient.from("user_roles").insert({
          user_id: userId,
          role: u.role || "calculista",
        });

        if (roleError) throw roleError;

        results.push({ email: u.email, status: "created" });
      } catch (err: any) {
        results.push({ email: u.email, status: "error", error: err.message });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({ summary: { total: users.length, created, skipped, errors }, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

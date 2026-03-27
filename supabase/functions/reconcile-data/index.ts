import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const batchSize = 500;
    let totalLinked = 0;
    let totalReconciled = 0;

    // Step 1: Relink orphan timesheet entries to processes (loop until done)
    console.log("Step 1: Relinking orphan timesheet entries...");
    for (let i = 0; i < 50; i++) { // max 50 iterations = 25k entries
      const { data, error } = await supabase.rpc("relink_orphan_timesheet_entries", { p_batch_size: batchSize });
      if (error) { console.error("Relink error:", error.message); break; }
      const linked = data?.linked || 0;
      totalLinked += linked;
      console.log(`  Batch ${i + 1}: linked ${linked} entries (total: ${totalLinked})`);
      if (linked < batchSize) break; // done
    }

    // Step 2: Reconcile open deadlines with matching timesheet entries
    console.log("Step 2: Reconciling open deadlines...");
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabase.rpc("reconcile_open_deadlines", { p_batch_size: batchSize });
      if (error) { console.error("Reconcile error:", error.message); break; }
      const reconciled = data?.reconciled || 0;
      totalReconciled += reconciled;
      console.log(`  Batch ${i + 1}: reconciled ${reconciled} deadlines (total: ${totalReconciled})`);
      if (reconciled < batchSize) break;
    }

    console.log(`Done: linked=${totalLinked}, reconciled=${totalReconciled}`);

    return new Response(JSON.stringify({
      status: "ok",
      linked_entries: totalLinked,
      reconciled_deadlines: totalReconciled,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("reconcile-data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

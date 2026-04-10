import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServiceAccountCredentials {
  private_key: string;
  client_email: string;
}

async function getAccessToken(
  credentials: ServiceAccountCredentials,
  userEmail: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKeyPem = credentials.private_key.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  const jwt = await new SignJWT({
    iss: credentials.client_email,
    sub: userEmail,
    scope:
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
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
    throw new Error(
      `Failed to get access token: ${tokenData.error_description || tokenData.error}`
    );
  }
  return tokenData.access_token;
}

async function getGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<{ status: string; summary?: string } | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events/${eventId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (response.status === 404 || response.status === 410) {
      return null; // Deleted
    }

    if (!response.ok) {
      console.warn(`Could not fetch event ${eventId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return { status: data.status || "confirmed", summary: data.summary };
  } catch (err) {
    console.warn(`Error fetching event ${eventId}:`, err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userEmail: string = body.userEmail;
    const calendarId: string = body.calendarId || "primary";

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "userEmail is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch service account
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    }
    const credentials: ServiceAccountCredentials = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(credentials, userEmail);

    // Fetch all open calendar_events that have a google_event_id (synced to Google)
    const { data: calendarEvents, error: eventsError } = await supabase
      .from("calendar_events")
      .select("id, title, start_at, end_at, google_event_id, process_deadline_id, sync_to_google, event_type")
      .not("google_event_id", "is", null)
      .eq("sync_to_google", true);

    if (eventsError) throw eventsError;

    console.log(`Found ${calendarEvents?.length || 0} synced events to cross-check`);

    const results = {
      total_checked: 0,
      synced_open: 0,
      missing_in_google: [] as Array<{
        calendar_event_id: string;
        title: string;
        start_at: string;
        google_event_id: string;
        process_deadline_id: string | null;
        reason: string;
      }>,
      cancelled_in_google: [] as Array<{
        calendar_event_id: string;
        title: string;
        start_at: string;
        google_event_id: string;
        process_deadline_id: string | null;
        reason: string;
      }>,
      ok: [] as Array<{
        calendar_event_id: string;
        title: string;
        start_at: string;
        google_event_id: string;
      }>,
    };

    for (const event of calendarEvents || []) {
      results.total_checked++;
      const googleEvent = await getGoogleEvent(
        accessToken,
        calendarId,
        event.google_event_id!
      );

      if (googleEvent === null) {
        // Deleted from Google
        results.missing_in_google.push({
          calendar_event_id: event.id,
          title: event.title,
          start_at: event.start_at,
          google_event_id: event.google_event_id!,
          process_deadline_id: event.process_deadline_id,
          reason: "Evento não encontrado no Google Calendar (deletado)",
        });
      } else if (googleEvent.status === "cancelled") {
        results.cancelled_in_google.push({
          calendar_event_id: event.id,
          title: event.title,
          start_at: event.start_at,
          google_event_id: event.google_event_id!,
          process_deadline_id: event.process_deadline_id,
          reason: "Evento cancelado no Google Calendar",
        });
      } else {
        results.synced_open++;
        results.ok.push({
          calendar_event_id: event.id,
          title: event.title,
          start_at: event.start_at,
          google_event_id: event.google_event_id!,
        });
      }
    }

    console.log(
      `Cross-check complete: ${results.synced_open} ok, ${results.missing_in_google.length} missing, ${results.cancelled_in_google.length} cancelled`
    );

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Cross-check error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

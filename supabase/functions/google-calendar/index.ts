import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> };
}

async function getAccessToken(credentials: ServiceAccountCredentials, userEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Fix private key newlines that may be escaped
  const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  
  const jwt = await new SignJWT({
    iss: credentials.client_email,
    sub: userEmail,
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
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

async function listCalendars(accessToken: string): Promise<any[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("List calendars error:", data);
    throw new Error(`Failed to list calendars: ${data.error?.message || "Unknown error"}`);
  }

  return data.items || [];
}

async function listEvents(
  accessToken: string,
  calendarId = "primary",
  timeMin?: string,
  timeMax?: string,
  maxResults = 50
): Promise<any[]> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    singleEvents: "true",
    orderBy: "startTime",
  });
  
  if (timeMin) params.append("timeMin", timeMin);
  if (timeMax) params.append("timeMax", timeMax);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("List events error:", data);
    throw new Error(`Failed to list events: ${data.error?.message || "Unknown error"}`);
  }

  return data.items || [];
}

async function getEvent(accessToken: string, calendarId: string, eventId: string): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Get event error:", data);
    throw new Error(`Failed to get event: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Create event error:", data);
    throw new Error(`Failed to create event: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<any> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Update event error:", data);
    throw new Error(`Failed to update event: ${data.error?.message || "Unknown error"}`);
  }

  return data;
}

async function deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 204) {
    const data = await response.json();
    console.error("Delete event error:", data);
    throw new Error(`Failed to delete event: ${data.error?.message || "Unknown error"}`);
  }
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
      calendarId = "primary", 
      eventId, 
      event, 
      timeMin, 
      timeMax, 
      maxResults 
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

    console.log(`Calendar action: ${action} for user: ${userEmail}`);

    let result: any;

    switch (action) {
      case "listCalendars": {
        const calendars = await listCalendars(accessToken);
        result = { calendars, count: calendars.length };
        break;
      }

      case "listEvents": {
        const events = await listEvents(accessToken, calendarId, timeMin, timeMax, maxResults || 50);
        result = { events, count: events.length };
        break;
      }

      case "getEvent": {
        if (!eventId) {
          return new Response(JSON.stringify({ error: "eventId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await getEvent(accessToken, calendarId, eventId);
        break;
      }

      case "createEvent": {
        if (!event || !event.summary || !event.start || !event.end) {
          return new Response(JSON.stringify({ error: "event with summary, start, and end is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await createEvent(accessToken, calendarId, event);
        break;
      }

      case "updateEvent": {
        if (!eventId || !event) {
          return new Response(JSON.stringify({ error: "eventId and event are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await updateEvent(accessToken, calendarId, eventId, event);
        break;
      }

      case "deleteEvent": {
        if (!eventId) {
          return new Response(JSON.stringify({ error: "eventId is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await deleteEvent(accessToken, calendarId, eventId);
        result = { success: true, message: "Event deleted" };
        break;
      }

      default:
        return new Response(JSON.stringify({ 
          error: "Invalid action. Use: listCalendars, listEvents, getEvent, createEvent, updateEvent, deleteEvent" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Calendar function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

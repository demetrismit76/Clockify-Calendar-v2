import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CLOCKIFY_BASE = "https://api.clockify.me/api/v1";

function computeRange(feedRange: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (feedRange === "day") {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  } else if (feedRange === "month") {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  } else {
    // week — Monday to Sunday
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    end = new Date(start.getTime());
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
  }

  return { start, end };
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function fmtDt(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d+/, "").replace(/Z$/, "") + "Z";
}

interface ClockifyEntry {
  id: string;
  description: string;
  timeInterval: { start: string; end: string; duration: string };
  project?: { name: string } | null;
  projectName?: string;
}

async function fetchClockifyEntries(
  apiKey: string,
  startDate: Date,
  endDate: Date,
  includeProjectPrefix: boolean
): Promise<{ ics: string; count: number }> {
  // Get current user
  const userRes = await fetch(`${CLOCKIFY_BASE}/user`, {
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
  });
  if (!userRes.ok) throw new Error("Clockify auth failed");
  const user = await userRes.json();

  // Get workspaces
  const wsRes = await fetch(`${CLOCKIFY_BASE}/workspaces`, {
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
  });
  if (!wsRes.ok) throw new Error("Failed to fetch workspaces");
  const workspaces = await wsRes.json();

  // Fetch from all workspaces
  const allEntries: ClockifyEntry[] = [];
  for (const ws of workspaces) {
    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      hydrated: "true",
      "page-size": "1000",
    });
    const res = await fetch(
      `${CLOCKIFY_BASE}/workspaces/${ws.id}/user/${user.id}/time-entries?${params}`,
      { headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const entries = await res.json();
      allEntries.push(
        ...entries.map((e: any) => ({
          ...e,
          projectName: e.project?.name || "No Project",
        }))
      );
    }
  }

  // Build ICS
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//Syncly//EN",
    "X-WR-CALNAME:Syncly Feed",
  ];

  for (const e of allEntries) {
    if (!e.timeInterval?.start || !e.timeInterval?.end) continue;
    const s = fmtDt(e.timeInterval.start);
    const ed = fmtDt(e.timeInterval.end);
    let summary = e.description || e.projectName || "Work Item";
    if (includeProjectPrefix && e.projectName && e.projectName !== "No Project") {
      summary = `Project: ${e.projectName} - ${summary}`;
    }
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@syncly`,
      `DTSTAMP:${s}`,
      `DTSTART:${s}`,
      `DTEND:${ed}`,
      `SUMMARY:${escapeICS(summary)}`,
      `DESCRIPTION:${escapeICS("Syncly Bridge Export")}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return { ics: lines.join("\r\n"), count: allEntries.length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token", { status: 400, headers: corsHeaders });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return new Response("Invalid token", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("calendar_feeds")
    .select("ics_content, feed_name, feed_range, user_id")
    .eq("feed_token", token)
    .single();

  if (error || !data) {
    return new Response("Feed not found", { status: 404, headers: corsHeaders });
  }

  const feedRange = data.feed_range || "week";
  const { start, end } = computeRange(feedRange);

  // Try to fetch live from Clockify using the user's API key
  let icsContent: string | null = null;
  let liveCount = 0;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("clockify_api_key, include_project_prefix_ics")
    .eq("user_id", data.user_id)
    .single();

  if (settings?.clockify_api_key) {
    try {
      const result = await fetchClockifyEntries(
        settings.clockify_api_key,
        start,
        end,
        settings.include_project_prefix_ics ?? false
      );
      icsContent = result.ics;
      liveCount = result.count;

      // Cache the result in the background
      (async () => {
        try {
          await supabase
            .from("calendar_feeds")
            .update({ ics_content: icsContent })
            .eq("feed_token", token);
        } catch (_e) { /* silent */ }
      })();
    } catch (e) {
      console.error("Clockify fetch failed, falling back to cached:", e);
    }
  }

  // Fallback to cached ICS if Clockify fetch failed or no API key
  if (!icsContent) {
    if (!data.ics_content) {
      icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "PRODID:-//Syncly//EN",
        "X-WR-CALNAME:" + (data.feed_name || "Syncly Feed"),
        "END:VCALENDAR",
      ].join("\r\n");
    } else {
      icsContent = data.ics_content;
    }
  }

  const eventCount = (icsContent.match(/BEGIN:VEVENT/g) || []).length;

  const response = new Response(icsContent, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${data.feed_name || "feed"}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });

  // Record sync history in the background
  const userId = data.user_id;
  (async () => {
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("sync_history")
        .select("id")
        .eq("user_id", userId)
        .eq("sync_mode", "webcal_feed")
        .gte("created_at", thirtyMinAgo)
        .limit(1);

      if (recent && recent.length > 0) return;

      await supabase.from("sync_history").insert({
        user_id: userId,
        entries_count: eventCount,
        sync_mode: "webcal_feed",
        status: "success",
      });
    } catch (_e) {
      // Silent fail
    }
  })();

  return response;
});

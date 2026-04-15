import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function computeRange(feedRange: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (feedRange === "day") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (feedRange === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // week — Monday to Sunday
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    end = new Date(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function parseDtstart(line: string): Date | null {
  // DTSTART:20250415T080000Z
  const val = line.replace(/^DTSTART[^:]*:/, "").trim();
  const m = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  return new Date(
    Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
  );
}

function filterIcsByRange(icsContent: string, feedRange: string): string {
  const { start, end } = computeRange(feedRange);

  // Split into VEVENT blocks
  const header: string[] = [];
  const events: string[] = [];
  let inEvent = false;
  let currentEvent: string[] = [];

  for (const line of icsContent.split(/\r?\n/)) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = [line];
    } else if (line === "END:VEVENT") {
      currentEvent.push(line);
      events.push(currentEvent.join("\r\n"));
      inEvent = false;
    } else if (inEvent) {
      currentEvent.push(line);
    } else if (line !== "END:VCALENDAR" && line.trim()) {
      header.push(line);
    }
  }

  // Filter events by DTSTART within range
  const filtered = events.filter((block) => {
    const dtstartLine = block.split(/\r?\n/).find((l) => l.startsWith("DTSTART"));
    if (!dtstartLine) return false;
    const dt = parseDtstart(dtstartLine);
    if (!dt) return false;
    return dt >= start && dt <= end;
  });

  return [...header, ...filtered, "END:VCALENDAR"].join("\r\n");
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

  if (!data.ics_content) {
    const empty = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "PRODID:-//Syncly//EN",
      "X-WR-CALNAME:" + (data.feed_name || "Syncly Feed"),
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(empty, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${data.feed_name || "feed"}.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Dynamically filter events by feed_range relative to today
  const filteredIcs = filterIcsByRange(data.ics_content, data.feed_range || "week");

  const response = new Response(filteredIcs, {
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

      const eventCount = (filteredIcs.match(/BEGIN:VEVENT/g) || []).length;

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

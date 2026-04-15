import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    .select("ics_content, feed_name, user_id")
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

  // Build response first
  const response = new Response(data.ics_content, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${data.feed_name || "feed"}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });

  // Record sync history in the background (don't block the response)
  const userId = data.user_id;
  const icsContent = data.ics_content;

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

      const eventCount = (icsContent.match(/BEGIN:VEVENT/g) || []).length;

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

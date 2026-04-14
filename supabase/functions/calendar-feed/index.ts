import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return new Response("Invalid token", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("calendar_feeds")
    .select("ics_content, feed_name")
    .eq("feed_token", token)
    .single();

  if (error || !data) {
    return new Response("Feed not found", { status: 404 });
  }

  if (!data.ics_content) {
    // Return empty valid calendar
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
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${data.feed_name || "feed"}.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  return new Response(data.ics_content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${data.feed_name || "feed"}.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});

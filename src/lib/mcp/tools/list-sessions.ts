import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "list_sessions",
  title: "List basketball sessions",
  description:
    "List upcoming basketball sessions for a club, with date, time, location, court type, capacity and current signup count. Use list_spaces first to get a club id.",
  inputSchema: {
    space_id: z.string().uuid().describe("Club (space) id from list_spaces."),
    include_past: z.boolean().optional().describe("Include sessions whose date has already passed."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ space_id, include_past }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("game_sessions")
      .select(
        "id, title, session_date, start_time, end_time, location, category, court, max_players, status, organizer_id, whatsapp_url",
      )
      .eq("space_id", space_id)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (!include_past) query = query.gte("session_date", new Date().toISOString().slice(0, 10));
    const { data, error } = await query;
    if (error) return toolError("Request failed. Check your access and try again.");
    const sessions = data ?? [];
    const ids = sessions.map((s) => s.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: signups } = await supabase.from("session_signups").select("session_id").in("session_id", ids);
      for (const row of signups ?? []) counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1);
    }
    return jsonResult({
      sessions: sessions.map((s) => ({ ...s, players_count: counts.get(s.id) ?? 0 })),
    });
  },
});
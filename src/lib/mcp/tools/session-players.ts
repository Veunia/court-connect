import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "get_session_players",
  title: "Get session players",
  description: "List the players signed up for a session and those on its waiting list, with their preferred position.",
  inputSchema: { session_id: z.string().uuid().describe("Session id from list_sessions.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ session_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [signups, waitlist] = await Promise.all([
      supabase.from("session_signups").select("user_id, created_at").eq("session_id", session_id),
      supabase.from("session_waitlist").select("user_id, created_at").eq("session_id", session_id),
    ]);
    if (signups.error) return toolError("Request failed. Check your access and try again.");
    if (waitlist.error) return toolError("Request failed. Check your access and try again.");
    const ids = [...new Set([...(signups.data ?? []), ...(waitlist.data ?? [])].map((r) => r.user_id))];
    const profiles = new Map<string, { full_name: string | null; position: string | null }>();
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id, full_name, position").in("id", ids);
      for (const p of data ?? []) profiles.set(p.id, { full_name: p.full_name, position: p.position });
    }
    const map = (rows: { user_id: string }[]) =>
      rows.map((r) => ({ user_id: r.user_id, ...(profiles.get(r.user_id) ?? { full_name: null, position: null }) }));
    return jsonResult({
      players: map(signups.data ?? []),
      waitlist: map(waitlist.data ?? []),
    });
  },
});
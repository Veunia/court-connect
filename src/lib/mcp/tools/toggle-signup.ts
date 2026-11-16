import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "set_my_signup",
  title: "Join or leave a session",
  description:
    "Sign the current user up for a session, put them on its waiting list, or remove them from both. Never affects other players.",
  inputSchema: {
    session_id: z.string().uuid().describe("Session id from list_sessions."),
    action: z.enum(["join", "leave", "waitlist"]).describe("join = sign up, waitlist = queue, leave = withdraw."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ session_id, action }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    if (action === "leave") {
      const a = await supabase.from("session_signups").delete().eq("session_id", session_id).eq("user_id", userId);
      const b = await supabase.from("session_waitlist").delete().eq("session_id", session_id).eq("user_id", userId);
      if (a.error) return toolError("Withdrawal failed. Try again.");
      if (b.error) return toolError("Withdrawal failed. Try again.");
      return jsonResult({ status: "left" });
    }

    const table = action === "join" ? "session_signups" : "session_waitlist";
    const { error } = await supabase.from(table).insert({ session_id, user_id: userId });
    if (error && !error.message.toLowerCase().includes("duplicate")) return toolError("Signup update failed (session may be full or closed).");
    return jsonResult({ status: action === "join" ? "signed_up" : "waitlisted" });
  },
});
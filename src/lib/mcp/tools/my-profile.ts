import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my player profile",
  description: "Read the signed-in user's Basket Crew player profile: name, preferred position and match counters.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, position, matches_played, cancellations")
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return toolError("Request failed. Check your access and try again.");
    return jsonResult({ profile: data, email: ctx.getUserEmail() ?? null });
  },
});
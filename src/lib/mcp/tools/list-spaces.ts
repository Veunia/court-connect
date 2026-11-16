import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";

export default defineTool({
  name: "list_spaces",
  title: "List my clubs",
  description: "List the Basket Crew clubs (spaces) the signed-in user belongs to, with their role in each.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("space_members")
      .select("role, space:spaces!inner(id, name, description)")
      .eq("user_id", ctx.getUserId());
    if (error) return toolError("Request failed. Check your access and try again.");
    const rows = (data ?? []) as unknown as {
      role: string;
      space: { id: string; name: string; description: string | null } | null;
    }[];
    return jsonResult({
      spaces: rows
        .filter((row) => row.space)
        .map((row) => ({ ...row.space!, role: row.role })),
    });
  },
});
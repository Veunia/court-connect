import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, notAuthenticated, supabaseForUser, toolError } from "../supabase";
import { ValidationError, sessionInputSchema, validate } from "../../validation";

export default defineTool({
  name: "create_session",
  title: "Create a session",
  description:
    "Create a basketball session in one of the signed-in user's clubs. The user becomes the organizer. Times are local HH:MM, date is YYYY-MM-DD.",
  inputSchema: {
    space_id: z.string().uuid().describe("Club (space) id from list_spaces."),
    title: z.string().optional().describe("Session title, e.g. 'Session du mardi'."),
    session_date: z.string().describe("Date as YYYY-MM-DD."),
    start_time: z.string().describe("Start time as HH:MM."),
    end_time: z.string().describe("End time as HH:MM."),
    location: z.string().describe("Gym, playground or address."),
    category: z.enum(["interieur", "exterieur", "tournoi"]).describe("Session category."),
    court: z.enum(["demi", "plein"]).describe("Half court or full court."),
    max_players: z.number().int().describe("Maximum number of players (2-30)."),
    whatsapp_url: z.string().optional().describe("Optional WhatsApp group link."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let clean;
    try {
      clean = validate(sessionInputSchema, {
        title: input.title ?? null,
        session_date: input.session_date,
        start_time: input.start_time,
        end_time: input.end_time,
        location: input.location,
        category: input.category,
        court: input.court,
        max_players: Math.round(input.max_players),
        whatsapp_url: input.whatsapp_url ?? null,
      });
    } catch (err) {
      return toolError(err instanceof ValidationError ? err.message : "Invalid session input.");
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("game_sessions")
      .insert({
        space_id: input.space_id,
        organizer_id: ctx.getUserId()!,
        ...clean,
      })
      .select("id, title, session_date, start_time, location")
      .single();
    if (error) return toolError("Session could not be created (check your club membership and inputs).");
    return jsonResult({ session: data });
  },
});
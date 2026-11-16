import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSpaces from "./tools/list-spaces";
import listSessions from "./tools/list-sessions";
import createSession from "./tools/create-session";
import sessionPlayers from "./tools/session-players";
import toggleSignup from "./tools/toggle-signup";
import myProfile from "./tools/my-profile";

// Le ref projet est la seule valeur Supabase qui survit à la publication.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

// `exactOptionalPropertyTypes` rend les outils (sans outputSchema) incompatibles
// avec le type large du SDK : on normalise ici.
const tools = [
  listSpaces,
  listSessions,
  sessionPlayers,
  createSession,
  toggleSignup,
  myProfile,
] as unknown as Parameters<typeof defineMcp>[0]["tools"];

export default defineMcp({
  name: "basket-crew",
  title: "Basket Crew",
  version: "0.1.0",
  instructions:
    "Tools for Basket Crew, a private app for organising basketball sessions inside clubs (spaces). Call list_spaces first to find the user's clubs, then list_sessions for a club's upcoming sessions. get_session_players shows who is in. create_session creates a session organised by the user, and set_my_signup joins, waitlists or withdraws the user only. All data is scoped to the signed-in user's clubs.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools,
});
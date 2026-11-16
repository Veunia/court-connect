import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SuggestInput = z.object({
  location: z.string().min(1).max(120),
  session_date: z.string().min(1).max(20),
  start_time: z.string().min(1).max(10),
  category: z.enum(["interieur", "exterieur", "tournoi"]),
  court: z.enum(["demi", "plein"]),
});

const CATEGORY_FR = {
  interieur: "en salle",
  exterieur: "en extérieur (playground)",
  tournoi: "tournoi",
} as const;

const LocationInput = z.object({
  query: z.string().min(2).max(80),
  category: z.enum(["interieur", "exterieur", "tournoi"]),
});

export const suggestLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LocationInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Clé IA manquante");

    const { streamText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");

    const gateway = createLovableAiGatewayProvider(key);
    const result = streamText({
      model: gateway("google/gemini-2.5-flash"),
      system:
        "Tu aides des amis à trouver où jouer au basket. À partir d'une ville ou d'un quartier, propose 5 lieux plausibles pour jouer au basket (gymnases, playgrounds, complexes sportifs, parcs). Réponds uniquement avec 5 lignes au format « Nom du lieu — ville ou quartier », sans numérotation, sans commentaire, sans emoji.",
      prompt: [
        `Ville ou quartier : ${data.query}`,
        `Recherche : ${
          data.category === "interieur"
            ? "salles et gymnases couverts"
            : data.category === "exterieur"
              ? "terrains extérieurs / playgrounds"
              : "sites pouvant accueillir un tournoi"
        }`,
      ].join("\n"),
    });

    const text = await result.text;
    const lines = text
      .split("\n")
      .map((line) => line.replace(/^[-*\d.)\s"“”]+|["“”]+$/g, "").trim())
      .filter((line) => line.length > 2 && !line.endsWith(":"));
    const dashed = lines.filter((line) => /[—–-]/.test(line));
    const places = (dashed.length ? dashed : lines).slice(0, 5);

    return { places };
  });

export const suggestSessionTitles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Clé IA manquante");

    const { streamText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");

    const gateway = createLovableAiGatewayProvider(key);
    const result = streamText({
      model: gateway("google/gemini-2.5-flash"),
      system:
        "Tu nommes des sessions de basket entre amis. Réponds uniquement avec 3 titres courts en français (max 5 mots chacun), un par ligne, sans numérotation, sans guillemets, sans emoji.",
      prompt: [
        `Type : ${CATEGORY_FR[data.category]}`,
        `Terrain : ${data.court === "demi" ? "demi-terrain" : "tout-terrain"}`,
        `Lieu : ${data.location}`,
        `Date : ${data.session_date} à ${data.start_time}`,
      ].join("\n"),
    });

    const text = await result.text;
    const titles = text
      .split("\n")
      .map((line) => line.replace(/^[-*\d.\s"“”]+|["“”]+$/g, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    return { titles };
  });
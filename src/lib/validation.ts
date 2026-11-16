import { z } from "zod";

/**
 * Schémas de validation partagés : formulaires, écritures Supabase et outils
 * agent (MCP) passent tous par ici, pour que rien ne dépende du seul contrôle
 * du navigateur.
 */

/** Erreur de validation : le message est déjà rédigé pour l'utilisateur. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Applique un schéma et transforme l'échec en message lisible. */
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const first = result.error.issues[0];
  throw new ValidationError(first?.message ?? "Données invalides.");
}

/**
 * Message à afficher : le détail n'est montré que pour une erreur de saisie.
 * Les erreurs techniques restent génériques (rien sur la base de données).
 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ValidationError ? err.message : fallback;
}

const trimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères maximum.`);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), "Date invalide.");

const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Horaire invalide.");

/** Lien de groupe WhatsApp uniquement (pas d'URL arbitraire). */
export const whatsappUrlSchema = z
  .string()
  .trim()
  .max(300, "Lien trop long.")
  .refine(
    (v) => /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/[\w\-./?=&%+]*$/i.test(v),
    "Le lien doit commencer par https://chat.whatsapp.com/ ou https://wa.me/.",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email trop long.")
  .pipe(z.string().email("Email invalide."));

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, "Code d'invitation invalide.");

export const uuidSchema = z.string().uuid("Identifiant invalide.");

export const sessionInputSchema = z
  .object({
    title: trimmed(80, "Titre").nullable().or(z.literal("").transform(() => null)),
    session_date: dateSchema,
    start_time: timeSchema,
    end_time: timeSchema,
    location: trimmed(160, "Lieu").min(2, "Indique un lieu."),
    category: z.enum(["interieur", "exterieur", "tournoi"]),
    court: z.enum(["demi", "plein"]),
    max_players: z
      .number()
      .int("Nombre de joueurs invalide.")
      .min(2, "Au moins 2 joueurs.")
      .max(50, "50 joueurs maximum."),
    whatsapp_url: whatsappUrlSchema.nullable().or(z.literal("").transform(() => null)),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["end_time"],
  });

export const profileInputSchema = z.object({
  full_name: trimmed(80, "Nom").min(1, "Indique ton nom.").nullable(),
  position: trimmed(30, "Poste").nullable(),
  avatar_url: z
    .string()
    .trim()
    .max(2000, "URL trop longue.")
    .refine((v) => /^https:\/\//i.test(v), "L'URL de l'image doit commencer par https://")
    .nullable(),
});

export const spaceInputSchema = z.object({
  name: trimmed(60, "Nom de l'espace").min(2, "Nom trop court."),
  description: trimmed(300, "Description"),
});
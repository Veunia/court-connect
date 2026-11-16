import { expect, type Page } from "@playwright/test";

/** Identifiants de test : jamais en dur, repli sur le compte de démo. */
export const TEST_EMAIL = process.env["E2E_EMAIL"] ?? "fred@basket.app";
export const TEST_PASSWORD = process.env["E2E_PASSWORD"] ?? "basket2026";

/** Connexion par email / mot de passe, puis attente de l'accueil. */
export async function signIn(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  const home = page.getByRole("heading", { name: /Prochaines sessions/i });
  // Le serveur de dev peut recharger la page pendant la saisie : on réessaie.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/auth", { waitUntil: "networkidle" });
    if (await home.isVisible().catch(() => false)) return;
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    try {
      await expect(home).toBeVisible({ timeout: 20_000 });
      return;
    } catch {
      if (attempt === 2) throw new Error("Connexion impossible après 3 tentatives.");
    }
  }
}

/** Date au format YYYY-MM-DD, décalée de `days` jours. */
export function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type CreatedSession = { title: string; url: string };

/**
 * Crée une session via le formulaire et renvoie son titre unique et son URL.
 * L'appelant est responsable de l'annuler en fin de test (voir cancelSession).
 */
export async function createSessionViaUi(
  page: Page,
  options: { category?: "INTÉRIEUR" | "EXTÉRIEUR" | "TOURNOI"; maxPlayers?: number } = {},
): Promise<CreatedSession> {
  const title = `E2E ${Date.now()}`;
  await page.goto("/session/nouvelle", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Nouvelle session/i })).toBeVisible();

  await page.getByLabel("Titre (facultatif)").fill(title);
  await page.getByLabel("Date").fill(isoInDays(7));
  await page.getByLabel("Début").fill("19:30");
  await page.getByLabel("Fin").fill("21:00");
  await page.getByLabel("Lieu").fill("Gymnase E2E");
  // On referme l'autocomplétion IA pour ne pas masquer le bouton d'envoi.
  await page.getByRole("heading", { name: /Nouvelle session/i }).click();
  await page.getByRole("button", { name: options.category ?? "INTÉRIEUR" }).click();
  await page.getByRole("button", { name: "DEMI-TERRAIN" }).click();
  if (options.maxPlayers !== undefined) {
    await page.getByLabel("Nombre maximal de joueurs").fill(String(options.maxPlayers));
  }

  await page.getByRole("button", { name: /Créer la session/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await page.waitForURL(/\/session\/[0-9a-f-]{36}/);
  return { title, url: page.url() };
}

/** Annule la session courante (nettoyage : l'organisateur ferme la session). */
export async function cancelCreatedSession(page: Page, session: CreatedSession) {
  await page.goto(session.url, { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: /Annuler la session/i }).first();
  if (!(await trigger.isVisible().catch(() => false))) return;
  await trigger.click();
  await page.getByRole("button", { name: "Annuler la session", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: /Prochaines sessions/i })).toBeVisible();
}

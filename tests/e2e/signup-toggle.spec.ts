import { expect, test } from "@playwright/test";
import { cancelCreatedSession, createSessionViaUi, signIn, type CreatedSession } from "./helpers";

test.describe("Inscription et désinscription", () => {
  let created: CreatedSession | null = null;

  test.afterEach(async ({ page }) => {
    if (created) await cancelCreatedSession(page, created);
    created = null;
  });

  test("s'inscrire puis se désinscrire met à jour le compteur et la liste", async ({ page }) => {
    await signIn(page);
    created = await createSessionViaUi(page, { maxPlayers: 10 });

    const count = page.getByTestId("affluence-count");
    await expect(count).toHaveText("0 / 10 joueurs");
    await expect(page.getByText(/Personne pour l'instant/i)).toBeVisible();

    // Inscription
    await page.getByRole("button", { name: "Je m'inscris" }).click();
    await expect(count).toHaveText("1 / 10 joueurs");
    await expect(page.getByTestId("player-item")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Joueurs inscrits \(1\)/i })).toBeVisible();

    // Désinscription
    await page.getByRole("button", { name: "Je me désinscris" }).click();
    await expect(count).toHaveText("0 / 10 joueurs");
    await expect(page.getByTestId("player-item")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Je m'inscris" })).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { TEST_EMAIL } from "./helpers";

/**
 * Vérifie la limitation progressive des tentatives : 3 essais libres, puis un
 * verrou de 15 s avant de pouvoir réessayer.
 */
test.describe("Rate limiting de la connexion", () => {
  test("verrouille le formulaire après trois échecs puis le rouvre", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/auth", { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe-e2e");

    const submit = page.getByRole("button", { name: /Se connecter/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      await submit.click();
      await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
      await expect(submit).toBeEnabled();
    }

    // 4e tentative : verrou de 15 secondes, bouton désactivé avec compte à rebours.
    await submit.click();
    const locked = page.getByRole("button", { name: /Réessaie dans \d+s/i });
    await expect(locked).toBeVisible();
    await expect(locked).toBeDisabled();

    // Après expiration du délai, le formulaire redevient utilisable.
    await expect(page.getByRole("button", { name: /Se connecter/i })).toBeEnabled({ timeout: 30_000 });
  });
});

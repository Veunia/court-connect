import { expect, test } from "@playwright/test";
import { cancelCreatedSession, createSessionViaUi, signIn, type CreatedSession } from "./helpers";

test.describe("Création de session", () => {
  let created: CreatedSession | null = null;

  test.afterEach(async ({ page }) => {
    if (created) await cancelCreatedSession(page, created);
    created = null;
  });

  test("un organisateur crée une session visible en détail et sur l'accueil", async ({ page }) => {
    await signIn(page);
    created = await createSessionViaUi(page, { maxPlayers: 12 });

    // Détail : titre, lieu, horaires et affluence à zéro inscrit.
    await expect(page.getByRole("heading", { level: 1, name: created.title })).toBeVisible();
    await expect(page.getByText("Gymnase E2E")).toBeVisible();
    await expect(page.getByText(/19\s*h\s*30/)).toBeVisible();
    await expect(page.getByTestId("affluence-count")).toHaveText("0 / 12 joueurs");

    // Accueil : la session apparaît dans la catégorie Intérieur.
    await page.goto("/");
    await expect(page.getByText(created.title)).toBeVisible();
  });
});

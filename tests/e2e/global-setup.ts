import { chromium } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./helpers";

/**
 * Préchauffage : le serveur de dev optimise ses dépendances au premier passage
 * et recharge la page, ce qui perturberait les tests. On visite donc chaque
 * écran une fois avant de lancer les scénarios.
 */
export default async function globalSetup() {
  const baseURL = process.env["E2E_BASE_URL"] ?? "http://localhost:8080";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`${baseURL}/auth`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(`${baseURL}/`, { timeout: 30_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    for (const path of ["/", "/session/nouvelle", "/espaces", "/profil"]) {
      await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" }).catch(() => undefined);
    }
  } finally {
    await browser.close();
  }
}

// Screenshot one or more routes of the running dev server, for a quick visual
// check. Requires the dev server to be up (see scripts/dev.sh) and the
// Playwright browser installed once:  bunx playwright install chromium
//
//   BASE_URL=http://localhost:8080 \
//   ROUTES=/,/auth,/reset-password \
//   OUT_DIR=./.screenshots \
//   bun scripts/screenshot.mjs
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:8080";
const routes = (process.env.ROUTES || "/auth").split(",").filter(Boolean);
const outDir = process.env.OUT_DIR || "./.screenshots";
const theme = process.env.THEME === "dark" ? "dark" : "light";

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 420, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: theme,
});
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

for (const route of routes) {
  const name = (route.replace(/[^\w]+/g, "_") || "root").replace(/^_|_$/g, "") || "root";
  try {
    await page.goto(base + route, { waitUntil: "networkidle", timeout: 45000 });
  } catch (e) {
    console.log(`nav warning ${route}: ${e.message}`);
  }
  await page.waitForTimeout(1200);
  const file = `${outDir}/${name}-${theme}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`shot ${route} -> ${file}  (landed on ${page.url()})`);
}

await browser.close();
console.log(errors.length ? `\nCONSOLE ERRORS:\n${errors.join("\n")}` : "\nno console errors");

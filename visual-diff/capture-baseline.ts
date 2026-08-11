// Captures frozen "ground truth" screenshots of the Node app into
// visual-diff/baselines/, one per scenario in scenarios.ts. Run this once
// (or again only if a division's Node design is deliberately changed before
// decommission — it shouldn't be, Node is frozen). The resulting PNGs are
// committed to git and are what compare.spec.ts checks the Rails app against.
//
// Usage: npm run capture-baseline
import "dotenv/config";
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scenarios } from "./scenarios.ts";
import { unclipScrollContainers } from "./layout-fix.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLD_APP_URL = process.env.OLD_APP_URL ?? "http://127.0.0.1:5050";
const OLD_APP_EMAIL = process.env.OLD_APP_EMAIL;
const OLD_APP_PASSWORD = process.env.OLD_APP_PASSWORD;

async function main() {
  const authScenarios = scenarios.filter((s) => s.requiresAuth);
  if (authScenarios.length > 0 && (!OLD_APP_EMAIL || !OLD_APP_PASSWORD)) {
    throw new Error(
      "OLD_APP_EMAIL and OLD_APP_PASSWORD must be set (copy .env.example to " +
        `.env) to capture: ${authScenarios.map((s) => s.name).join(", ")}`,
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  if (authScenarios.length > 0) {
    console.log(`Logging into Node app at ${OLD_APP_URL}...`);
    await page.goto(`${OLD_APP_URL}/login`);
    await page.locator('[data-testid="input-email"]').fill(OLD_APP_EMAIL!);
    await page.locator('[data-testid="input-password"]').fill(OLD_APP_PASSWORD!);
    await page.locator('[data-testid="button-login"]').click();
    await page.waitForLoadState("networkidle");
  }

  for (const scenario of scenarios) {
    console.log(`Capturing baseline: ${scenario.name}`);
    await page.goto(`${OLD_APP_URL}${scenario.oldPath}`);
    await page.waitForLoadState("networkidle");

    const dest = path.join(__dirname, "baselines", `${scenario.name}.png`);
    if (scenario.oldContentSelector) {
      // Otherwise the locator screenshot is clipped to whatever fits in the
      // viewport height — see layout-fix.ts.
      await unclipScrollContainers(page);
      await page.locator(scenario.oldContentSelector).first().screenshot({
        path: dest,
        animations: "disabled",
      });
    } else {
      await page.screenshot({ path: dest, animations: "disabled", fullPage: true });
    }
  }

  await browser.close();
  console.log(`\nCaptured ${scenarios.length} baseline(s) into visual-diff/baselines/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

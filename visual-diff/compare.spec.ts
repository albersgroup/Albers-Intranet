// Checks the Rails app against the frozen Node baselines in
// visual-diff/baselines/ (see capture-baseline.ts). Rails' portal routes are
// public, so unlike capture-baseline.ts this needs no login step.
//
// Usage: npm run compare  (then: npm run report)
import "dotenv/config";
import { test, expect } from "@playwright/test";
import { scenarios } from "./scenarios.ts";
import { unclipScrollContainers } from "./layout-fix.ts";

const NEW_APP_URL = process.env.NEW_APP_URL ?? "http://127.0.0.1:4123";

for (const scenario of scenarios) {
  test(`${scenario.name} matches the Node baseline`, async ({ page }) => {
    // See Scenario.viewportWidth — authenticated Node baselines are 1152 wide
    // (1440 minus the sidebar Rails doesn't have).
    if (scenario.viewportWidth) {
      await page.setViewportSize({ width: scenario.viewportWidth, height: 900 });
    }
    await page.goto(`${NEW_APP_URL}${scenario.newPath}`);
    await page.waitForLoadState("networkidle");

    if (scenario.newContentSelector) {
      // No-op on Rails today (no fixed-height/overflow shell), but keeps this
      // resilient if that ever changes — see layout-fix.ts.
      await unclipScrollContainers(page);
      await expect(page.locator(scenario.newContentSelector).first()).toHaveScreenshot(
        `${scenario.name}.png`,
      );
    } else {
      await expect(page).toHaveScreenshot(`${scenario.name}.png`, { fullPage: true });
    }
  });
}

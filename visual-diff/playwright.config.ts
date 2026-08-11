import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "compare.spec.ts",
  fullyParallel: false,
  reporter: [["html", { open: "never" }]],
  // Baselines live in a plain, predictable path — capture-baseline.ts writes
  // directly into the same directory this template resolves to, so a
  // scenario's baseline and its comparison target are always the same file.
  snapshotPathTemplate: "{testDir}/baselines/{arg}{ext}",
  use: {
    viewport: { width: 1440, height: 900 },
  },
  expect: {
    toHaveScreenshot: {
      // Small tolerance for font hinting/anti-aliasing noise, not a license
      // to drift — see VISUAL_DIFF_PLAN.md.
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

"use strict";

// End-to-end tests: the built UI in a real browser against a real sis-api and
// MongoDB. See test/e2e/support/env.js for the settings (SIS_API_DIR,
// SIS_E2E_MONGO_URL).

var { defineConfig, devices } = require("@playwright/test");

var BROWSER = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
var VISUAL = /visual\.spec\.js/;
var VISUAL_SNAPSHOTS = "{testDir}/{testFilePath}-snapshots/{arg}-visual{-snapshotSuffix}{ext}";

module.exports = defineConfig({
    testDir: "test/e2e",
    globalSetup: require.resolve("./test/e2e/support/global-setup"),
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    timeout: 30000,
    expect: { timeout: 5000 },
    use: {
        viewport: { width: 1280, height: 800 },
        trace: "retain-on-failure",
        screenshot: "only-on-failure"
    },
    projects: [
        {
            name: "chromium",
            testIgnore: VISUAL,
            use: BROWSER
        },
        {
            // screenshot baselines: one test at a time, see visual.spec.js
            name: "visual",
            testMatch: VISUAL,
            workers: 1,
            snapshotPathTemplate: VISUAL_SNAPSHOTS,
            use: BROWSER
        }
    ]
});

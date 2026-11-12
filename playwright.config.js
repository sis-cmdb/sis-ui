"use strict";

// End-to-end tests: the built UI in a real browser against a real sis-api and
// MongoDB. See test/e2e/support/env.js for the settings (SIS_API_DIR,
// SIS_E2E_MONGO_URL).

var { defineConfig, devices } = require("@playwright/test");

var BROWSER = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
var VISUAL = /visual\.spec\.js/;
// shared by both UIs' visual projects
var VISUAL_SNAPSHOTS = "{testDir}/{testFilePath}-snapshots/{arg}-visual{-snapshotSuffix}{ext}";
// tests of the Vue rewrite itself
var VUE_ONLY = /[\\/]vue[\\/]/;

function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Tests of pages the Vue rewrite does not have yet (the add, edit and view
// forms, phase 3 of the migration). Remove them here as the pages land.
var VUE_PENDING_FILES = [/schema-editor\.spec\.js/, /entity-editor\.spec\.js/];
var VUE_PENDING_TESTS = new RegExp([
    "a new schema can be created from the form",
    "save is disabled until the required fields are filled in",
    "an existing schema can be edited",
    "the list shows entities by their id field and links to a read only view",
    "a new entity can be added from the form",
    "items can be added to array fields",
    "required fields and invalid addresses keep the form from being saved",
    "an entity can be edited",
    "clone starts a new entity from an existing one",
    "visitors who are not logged in can view but not change entities",
    "the list shows hooks with their entity type and owners",
    "a new hook can be created from the form",
    "a script can be written in the code editor and saved",
    "the code editor shows a saved script read only on the view page",
    ...["schema add", "schema edit", "entity add", "entity edit", "entity view", "hook add", "hook edit",
        "hook view", "script add", "script edit", "script view"].map(function(page) {
        return "the " + page + " page can be opened from a direct link";
    }),
    // visual.spec.js
    "visual schema forms",
    "visual entity forms",
    "visual hook and script forms",
    "visual theme"
].map(escape).join("|"));

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
            testIgnore: [VISUAL, VUE_ONLY],
            use: BROWSER
        },
        {
            // screenshot baselines: one test at a time, see visual.spec.js
            name: "visual",
            testMatch: VISUAL,
            workers: 1,
            snapshotPathTemplate: VISUAL_SNAPSHOTS,
            use: BROWSER
        },
        {
            // the same tests against the Vue rewrite (vue/), without the ones for
            // pages it does not have yet
            name: "vue",
            testIgnore: [VISUAL, ...VUE_PENDING_FILES],
            grepInvert: VUE_PENDING_TESTS,
            use: { ...BROWSER, ui: "vue" }
        },
        {
            // the Vue rewrite must look the same: compared with the same baselines.
            // After "visual", since both use the same fixed names.
            name: "visual-vue",
            testMatch: VISUAL,
            grepInvert: VUE_PENDING_TESTS,
            workers: 1,
            snapshotPathTemplate: VISUAL_SNAPSHOTS,
            dependencies: ["visual"],
            use: { ...BROWSER, ui: "vue" }
        }
    ]
});

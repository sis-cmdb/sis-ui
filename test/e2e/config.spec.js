"use strict";

// The runtime configuration: app/js/config.js, supplied by the deployment, in
// the current format and in the AngularJS UI's, which existing deployments have.

var fs = require("node:fs");
var path = require("node:path");
var { test, expect, env } = require("./fixtures");

var UI_VERSION = JSON.parse(fs.readFileSync(path.join(env.ROOT, "package.json"), "utf8")).version;
var CONFIG = /\/app\/js\/config\.js$/;

function footer(page) {
    return page.locator(".footer");
}

// answers app/js/config.js with the given script
function serveConfig(page, body) {
    return page.route(CONFIG, function(route) {
        return route.fulfill({ contentType: "text/javascript", body: body });
    });
}

test("reads app/js/config.js setting window.SIS_CONFIG", async function({ page, sis }) {
    await serveConfig(page, "window.SIS_CONFIG = " + JSON.stringify({ API_URL: sis.apiUrl + "/" }) + ";");
    var info = page.waitForRequest(/\/api\/v1\.1\/info$/);
    await page.goto("/");

    expect((await info).url()).toBe(sis.apiUrl + "/api/v1.1/info");
    await expect(footer(page)).toContainText(new RegExp("API \\d+\\.\\d+\\.\\d+-\\S+"));
    await expect(footer(page)).toContainText("UI " + UI_VERSION + "-local-build");
});

test("reads app/js/config.js in the AngularJS UI's format", async function({ page, sis }) {
    await serveConfig(page, "angular.module('sisconfig', [])\n    .constant(\"API_URL\", " + JSON.stringify(sis.apiUrl) + ");\n");
    var info = page.waitForRequest(/\/api\/v1\.1\/info$/);
    await page.goto("/#/schemas");

    expect((await info).url()).toBe(sis.apiUrl + "/api/v1.1/info");
    await expect(page.getByRole("heading", { name: "Schemas" })).toBeVisible();
    await expect(footer(page)).toContainText(new RegExp("API \\d+\\.\\d+\\.\\d+-\\S+"));
});

test("still shows the page when the API cannot be reached", async function({ page, pageErrors }) {
    pageErrors.allow(/ERR_CONNECTION_REFUSED|Failed to load resource/);
    // nothing listens on port 9
    await serveConfig(page, "window.SIS_CONFIG = { API_URL: 'http://127.0.0.1:9' };");
    await page.goto("/#/schemas");

    await expect(page.getByRole("heading", { name: "Schemas" })).toBeVisible();
    await expect(footer(page)).toContainText("UI " + UI_VERSION + "-local-build");
    await expect(footer(page)).not.toContainText(/API \d/);
});

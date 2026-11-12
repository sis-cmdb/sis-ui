"use strict";

// The Vue rewrite's foundation in a real browser against a real sis-api: the
// runtime config.js (in both formats) and the API client.

var fs = require("node:fs");
var path = require("node:path");
var { test, expect, env } = require("../fixtures");

var UI_VERSION = JSON.parse(fs.readFileSync(path.join(env.ROOT, "package.json"), "utf8")).version;

function footer(page) {
    return page.locator(".footer");
}

test("reads an AngularJS style config.js and shows the API and UI versions", async function({ page }) {
    var config = page.waitForResponse(/\/config\.js$/);
    await page.goto("/");
    expect(await (await config).text()).toContain("angular.module('sisconfig'");

    await expect(footer(page)).toContainText(new RegExp("API \\d+\\.\\d+\\.\\d+-\\S+"));
    await expect(footer(page)).toContainText("UI " + UI_VERSION + "-local-build");
});

test("reads a config.js that sets window.SIS_CONFIG", async function({ page, sis }) {
    await page.route(/\/config\.js$/, function(route) {
        return route.fulfill({
            contentType: "text/javascript",
            body: "window.SIS_CONFIG = " + JSON.stringify({ API_URL: sis.apiUrl + "/" }) + ";"
        });
    });
    var info = page.waitForRequest(/\/api\/v1\.1\/info$/);
    await page.goto("/");

    expect((await info).url()).toBe(sis.apiUrl + "/api/v1.1/info");
    await expect(footer(page)).toContainText(new RegExp("API \\d+\\.\\d+\\.\\d+-\\S+"));
});

test("says so when the API cannot be reached", async function({ page, pageErrors }) {
    pageErrors.allow(/ERR_CONNECTION_REFUSED|Failed to load resource/);
    await page.route(/\/config\.js$/, function(route) {
        // nothing listens on port 9
        return route.fulfill({ contentType: "text/javascript", body: "window.SIS_CONFIG = { API_URL: 'http://127.0.0.1:9' };" });
    });
    await page.goto("/");

    await expect(footer(page)).toContainText("The SIS API could not be reached");
    await expect(footer(page)).toContainText("UI " + UI_VERSION + "-local-build");
});

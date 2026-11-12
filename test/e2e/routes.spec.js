"use strict";

// Every URL the UI has ever served must keep working: other tools link to these
// pages and embed them. Each one is opened directly (not by navigating there) and
// must show its page without being redirected.

var { test, expect } = require("./fixtures");
var { SisClient } = require("./support/sis-client");

var names = {};
var client;

// in order, in one worker; a failure restarts the worker (and beforeAll)
test.describe.configure({ mode: "default" });

test.beforeAll(async function({ sis }, testInfo) {
    var suffix = "w" + testInfo.workerIndex + "_" + Math.random().toString(36).slice(2, 7);
    names = { schema: "route_" + suffix, hook: "hook_" + suffix, script: "script_" + suffix };
    client = new SisClient(sis.apiUrl, sis.adminToken);
    await client.createSchema({ name: names.schema, id_field: "name",
                                definition: { name: { type: "String", required: true, unique: true } } });
    names.entity = (await client.createEntity(names.schema, { name: "e1" }))._id;
    await client.createHook({ name: names.hook, entity_type: names.schema, events: ["insert"],
                              target: { action: "GET", url: "http://127.0.0.1:9/x" } });
    await client.createScript({ name: names.script, script_type: "application/javascript", script: "1;" });
});

test.afterAll(async function() {
    await client.cleanup();
});

// [title, url, heading]; functions because the names are made in beforeAll
var ROUTES = [
    ["schema list", () => "/#/schemas", () => "Schemas"],
    ["schema add", () => "/#/schemas/add", () => "Add a new schema"],
    ["schema edit", () => "/#/schemas/edit/" + names.schema, () => "Modify schema " + names.schema],
    ["entity list", () => "/#/entities/" + names.schema, () => names.schema + " Entities"],
    ["filtered entity list", () => "/#/entities/" + names.schema + "?q=" + encodeURIComponent('name = "e1"'),
     () => names.schema + " Entities"],
    ["entity add", () => "/#/entities/" + names.schema + "/add", () => "Add a new entity of type " + names.schema],
    ["entity edit", () => "/#/entities/" + names.schema + "/edit/" + names.entity,
     () => "Modify entity of type " + names.schema + " - e1"],
    ["entity view", () => "/#/entities/" + names.schema + "/view/" + names.entity,
     () => "View entity e1 of type " + names.schema],
    ["hook list", () => "/#/hooks", () => "Hooks"],
    ["hook add", () => "/#/hooks/add", () => "Add a new hook"],
    ["hook edit", () => "/#/hooks/edit/" + names.hook, () => "Modify hook " + names.hook],
    ["hook view", () => "/#/hooks/view/" + names.hook, () => "View hook " + names.hook],
    ["script list", () => "/#/scripts", () => "Scripts"],
    ["script add", () => "/#/scripts/add", () => "Add a new script"],
    ["script edit", () => "/#/scripts/edit/" + names.script, () => "Modify script " + names.script],
    ["script view", () => "/#/scripts/view/" + names.script, () => "View script " + names.script],
    ["user list", () => "/#/users", () => "SIS Users"],
    ["tokens", () => "/#/tokens", () => "Tokens"],
    ["entity history", () => "/#/commits/entities/" + names.schema + "/" + names.entity,
     () => "Commits for " + names.schema + " " + names.entity],
    ["schema history", () => "/#/commits/schemas/" + names.schema, () => "Commits for schemas " + names.schema],
    ["hook history", () => "/#/commits/hooks/" + names.hook, () => "Commits for hooks " + names.hook],
    ["script history", () => "/#/commits/scripts/" + names.script, () => "Commits for scripts " + names.script],
    ["docs page", () => "/#/docs/schemas", () => "Schema API"]
];

test.describe("direct links", function() {
    for (var r of ROUTES) {
        let [title, url, heading] = r;
        test("the " + title + " page can be opened from a direct link", async function({ page, signIn }) {
            await signIn(page);
            await page.goto(url());
            await expect(page.getByRole("heading", { name: heading(), exact: true }).first()).toBeVisible();
            expect(new URL(page.url()).hash).toBe(url().slice(1));
        });
    }
});

test("the login page can be opened from a direct link", async function({ page }) {
    await page.goto("/#/login");
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
    await expect(page).toHaveURL(/#\/login$/);
});

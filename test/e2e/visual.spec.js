"use strict";

// Screenshot baselines of every page and dialog, so a rewrite of the UI can be
// compared with the current look pixel by pixel.
//
// Runs in its own project, one test at a time (playwright.config.js), with
// fixed names so the pages render the same every run. Lists are filtered down to
// this file's data because the other tests run at the same time. Baselines are
// per platform; update them with `npm run test:e2e -- --project visual
// --update-snapshots`.

var { test, expect } = require("./fixtures");
var { SisClient } = require("./support/sis-client");
var pages = require("./support/pages");

var RACK = "visual_rack";
var HOST = "visual_host";
var HOOK = "visual_hook";
var SCRIPT = "visual_script";
var USER = { name: "visual_user", pw: "visual_pw_1", roles: { visual: "admin", ops: "user" } };

var ids = {};

async function removeIfPresent(client, path) {
    try {
        await client.del(path);
    } catch (err) {
        if (err.status !== 404) {
            throw err;
        }
    }
}

async function removeAll(client) {
    await removeIfPresent(client, "/hooks/" + HOOK);
    await removeIfPresent(client, "/scripts/" + SCRIPT);
    await removeIfPresent(client, "/schemas/" + HOST);
    await removeIfPresent(client, "/schemas/" + RACK);
    await removeIfPresent(client, "/users/" + USER.name);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async function({ sis }) {
    var client = new SisClient(sis.apiUrl, sis.adminToken);
    await removeAll(client);
    await client.post("/users", { name: USER.name, pw: USER.pw, email: "visual@example.com", roles: USER.roles });
    await client.post("/schemas", { name: RACK, id_field: "name", _sis: { owner: ["visual"] },
                                    definition: { name: { type: "String", required: true, unique: true } } });
    await client.post("/schemas", {
        name: HOST,
        description: "Hosts in the data center",
        id_field: "hostname",
        _sis: { owner: ["visual", "ops"] },
        definition: {
            hostname: { type: "String", required: true, unique: true, comment: "Fully qualified name" },
            ip: "IpAddress",
            cpus: { type: "Number", min: 1, max: 128 },
            active: "Boolean",
            env: { type: "String", enum: ["prod", "stage", "dev"] },
            location: { rack: { type: "ObjectId", ref: RACK }, row: "String" },
            tags: ["String"],
            disks: [{ dev: "String", size: "Number" }],
            data: "Mixed",
            notes: "String"
        }
    });
    var rack = await client.post("/entities/" + RACK, { name: "r1", _sis: { owner: ["visual"] } });
    var web1 = {
        hostname: "web1.example.com", ip: "10.1.2.3", cpus: 8, active: true, env: "prod",
        location: { rack: rack._id, row: "A" }, tags: ["web", "edge"],
        disks: [{ dev: "sda", size: 512 }], data: { role: "frontend", weight: 3 }, notes: "First web server",
        _sis: { owner: ["visual"] }
    };
    var created = await client.post("/entities/" + HOST, web1);
    ids.web1 = created._id;
    // keep the disk's generated id, or the update replaces it with a new one
    web1.disks = created.disks;
    web1.cpus = 16;
    web1.notes = "First web server, upgraded";
    await client.put("/entities/" + HOST + "/" + created._id, web1);
    await client.post("/hooks", { name: HOOK, entity_type: HOST, events: ["insert", "update"],
                                  _sis: { owner: ["visual"] }, target: { action: "POST", url: "http://hooks.example.com/sis" } });
    await client.post("/scripts", { name: SCRIPT, description: "Says hello", script_type: "application/javascript",
                                    _sis: { owner: ["visual"] }, script: "res.send('hello');\n" });
});

test.afterAll(async function({ sis }) {
    await removeAll(new SisClient(sis.apiUrl, sis.adminToken));
});

async function snap(page, name, opts) {
    await expect(page).toHaveScreenshot(name + ".png", Object.assign({ fullPage: true }, opts));
}

// dialogs are fixed to the viewport, so a full page screenshot would depend on
// how far the page is scrolled
async function snapDialog(page, name) {
    await page.evaluate(function() { globalThis.scrollTo(0, 0); });
    await expect(page).toHaveScreenshot(name + ".png");
}

// the entity id (in the title) and commit times change every run
function commitMasks(page) {
    return [page.getByRole("heading", { level: 3 }), page.locator(".panel-heading .panel-title a")];
}

test.describe("visual", function() {
    test("login", async function({ page, pageErrors }) {
        // an unknown user is a 404
        pageErrors.allow(/status of 404/);
        await page.goto("/#/login");
        await expect(page.getByLabel("Username")).toBeVisible();
        await snap(page, "login");
        await page.getByLabel("Username").fill("nobody");
        await page.getByLabel("Password").fill("wrong");
        await page.getByRole("button", { name: "Login" }).click();
        await expect(page.getByText("Authentication failed.")).toBeVisible();
        await snap(page, "login-failed");
    });

    test("schemas", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/schemas");
        await page.getByLabel("Filter").fill("visual_");
        await expect(pages.tableRow(page, HOST)).toBeVisible();
        await expect(page.locator("table tbody tr")).toHaveCount(2);
        await snap(page, "schema-list");

        await page.goto("/#/schemas/add");
        await expect(page.getByRole("heading", { name: "Add a new schema" })).toBeVisible();
        await snap(page, "schema-add");

        await page.goto("/#/schemas/edit/" + HOST);
        await expect(page.getByRole("heading", { name: "Modify schema " + HOST })).toBeVisible();
        await expect(pages.form(page).getByRole("link", { name: "Remove field hostname" })).toBeVisible();
        await snap(page, "schema-edit");

        await page.getByRole("button", { name: "Toggle JSON" }).click();
        await expect(page.locator("pre")).toContainText(HOST);
        // the JSON has the schema's id and timestamps
        await snap(page, "schema-edit-json", { mask: [page.locator("pre")] });
        await page.getByRole("button", { name: "Toggle JSON" }).click();

        await pages.form(page).getByRole("button", { name: "Field attributes hostname", exact: true }).click();
        await expect(pages.modal(page).getByLabel("match", { exact: true })).toBeVisible();
        await pages.modal(page).getByLabel("match", { exact: true }).fill("/[a-z/");
        // the focus ring fades in, which would make the screenshot vary
        await pages.modal(page).getByLabel("match", { exact: true }).blur();
        await expect(pages.modal(page).getByText("Not a valid regular expression")).toBeVisible();
        await snapDialog(page, "schema-attributes");
    });

    test("entities", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/entities/" + HOST);
        await expect(pages.tableRow(page, "web1.example.com")).toBeVisible();
        await snap(page, "entity-list");

        await page.getByRole("link", { name: "Definition Fields" }).click();
        // wait for the expand animation to finish
        await expect(page.locator(".panel-collapse").first()).toHaveClass(/(^|\s)in(\s|$)/);
        await expect(page.locator(".panel-collapse").first()).not.toHaveClass(/collapsing/);
        await snap(page, "entity-list-definition");

        await pages.tableRow(page, "web1.example.com").getByRole("link", { name: "Remove" }).click();
        await expect(pages.modal(page).getByRole("button", { name: "Confirm" })).toBeVisible();
        await snapDialog(page, "confirm-dialog");
        await pages.modal(page).getByRole("button", { name: "Cancel" }).click();
        await expect(pages.modal(page)).toHaveCount(0);

        await page.reload();
        await expect(pages.tableRow(page, "web1.example.com")).toBeVisible();
        await page.locator(".glyphicon-question-sign").click();
        await expect(pages.modal(page)).toBeVisible();
        await snapDialog(page, "filter-reference");
    });

    test("entity forms", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/entities/" + HOST + "/view/" + ids.web1);
        await expect(pages.entityInput(page, "rack")).toHaveValue("r1");
        await snap(page, "entity-view");

        await page.goto("/#/entities/" + HOST + "/edit/" + ids.web1);
        await expect(pages.entityInput(page, "rack")).toHaveValue("r1");
        await snap(page, "entity-edit");

        await page.getByRole("button", { name: "Choose" }).click();
        await expect(pages.tableRow(pages.modal(page), "r1")).toBeVisible();
        await snapDialog(page, "entity-chooser");
        await pages.modal(page).getByRole("button", { name: "Cancel" }).click();
        await expect(pages.modal(page)).toHaveCount(0);

        await page.getByRole("link", { name: "Open Editor" }).click();
        await expect(page.locator(".modal")).toBeFocused();
        await expect(pages.modal(page).locator(".ace_content")).toContainText("frontend");
        await snapDialog(page, "code-editor");
        await pages.modal(page).getByRole("button", { name: "Close" }).click();
        await expect(pages.modal(page)).toHaveCount(0);

        await page.goto("/#/entities/" + HOST + "/add");
        await pages.entityInput(page, "ip").fill("10.0.0.999");
        await expect(pages.entityInput(page, "ip")).toHaveAttribute("aria-invalid", "true");
        await pages.entityInput(page, "ip").blur();
        await snap(page, "entity-add-invalid");
    });

    test("history", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/commits/entities/" + HOST + "/" + ids.web1);
        var commits = page.locator(".panel");
        await expect(commits).toHaveCount(2);
        await snap(page, "history", { mask: commitMasks(page) });
        await commits.nth(0).locator(".panel-heading a").click();
        await expect(commits.nth(0).locator(".jsondiffpatch-modified").first()).toBeVisible();
        await snap(page, "history-diff", { mask: commitMasks(page) });
        await commits.nth(1).locator(".panel-heading a").click();
        await expect(commits.nth(1).locator("pre")).toBeVisible();
        // the inserted object has ids and timestamps
        await snap(page, "history-insert", { mask: commitMasks(page).concat([commits.nth(1).locator("pre")]) });
    });

    test("hooks and scripts", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/hooks?q=" + encodeURIComponent("name = \"" + HOOK + "\""));
        await expect(page.locator("table tbody tr")).toHaveCount(1);
        await snap(page, "hook-list");
        await page.goto("/#/hooks/view/" + HOOK);
        await expect(pages.entityInput(page, "url")).toHaveValue("http://hooks.example.com/sis");
        await snap(page, "hook-view");
        await page.goto("/#/hooks/edit/" + HOOK);
        await expect(pages.entityInput(page, "url")).toHaveValue("http://hooks.example.com/sis");
        await snap(page, "hook-edit");

        await page.goto("/#/scripts?q=" + encodeURIComponent("name = \"" + SCRIPT + "\""));
        await expect(page.locator("table tbody tr")).toHaveCount(1);
        await snap(page, "script-list");
        await page.goto("/#/scripts/view/" + SCRIPT);
        await expect(pages.entityInput(page, "name")).toHaveValue(SCRIPT);
        await snap(page, "script-view");
    });

    test("users and tokens", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/users");
        await page.getByLabel("Filter").fill("name = \"" + USER.name + "\"");
        await page.getByRole("button", { name: "Filter", exact: true }).click();
        await expect(page.locator("table tbody tr")).toHaveCount(1);
        await snap(page, "user-list");

        await pages.tableRow(page, USER.name).getByRole("link", { name: "Edit" }).click();
        await expect(pages.modal(page).getByLabel("visual", { exact: true })).toBeVisible();
        await snapDialog(page, "user-edit");
        await pages.modal(page).getByRole("button", { name: "Cancel" }).click();
        await expect(pages.modal(page)).toHaveCount(0);

        await pages.tableRow(page, USER.name).getByText("ops", { exact: true }).click();
        await expect(pages.modal(page).getByRole("heading", { name: "Users belonging to ops" })).toBeVisible();
        await expect(pages.tableRow(pages.modal(page), USER.name)).toBeVisible();
    });

    test("tokens", async function({ page, signIn }) {
        await signIn(page, USER);
        await page.goto("/#/tokens");
        await expect(page.getByText("Login session")).toBeVisible();
        // token names and expiry times change every run
        await snap(page, "tokens", { mask: [page.locator("table").first().locator("tbody td:not(:first-child)")] });
    });

    test("layout", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/docs/schemas");
        await expect(page.getByRole("heading", { name: "Schema API" })).toBeVisible();
        await snap(page, "docs", { fullPage: false });

        await page.goto("/#/entities/" + HOST + "/view/" + ids.web1);
        await expect(pages.entityInput(page, "rack")).toHaveValue("r1");
        await page.locator("header").getByRole("link", { name: "Theme" }).click();
        await page.locator("header").getByRole("link", { name: "slate" }).click();
        await expect(page.locator("link#theme")).toHaveAttribute("href", /slate/);
        await snap(page, "entity-view-slate");
    });

    test("embed", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/entities/" + HOST + "?embed=true");
        await expect(pages.tableRow(page, "web1.example.com")).toBeVisible();
        await snap(page, "embed");
    });
});

"use strict";

// Every URL the UI has ever served must keep working: other tools link to these
// pages and embed them. Each one is opened directly (not by navigating there) and
// must show its page without being redirected.

var { test, expect } = require("./fixtures");

test("every page can be opened from a direct link", async function({ page, api, signIn, uniqueName }) {
    var schema = uniqueName("route");
    var hook = uniqueName("hook");
    var script = uniqueName("script");
    await api.createSchema({ name: schema, id_field: "name",
                             definition: { name: { type: "String", required: true, unique: true } } });
    var entity = await api.createEntity(schema, { name: "e1" });
    await api.createHook({ name: hook, entity_type: schema, events: ["insert"],
                           target: { action: "GET", url: "http://127.0.0.1:9/x" } });
    await api.createScript({ name: script, script_type: "application/javascript", script: "1;" });
    await signIn(page);

    var routes = [
        ["/#/schemas", "Schemas"],
        ["/#/schemas/add", "Add a new schema"],
        ["/#/schemas/edit/" + schema, "Modify schema " + schema],
        ["/#/entities/" + schema, schema + " Entities"],
        ["/#/entities/" + schema + "?q=" + encodeURIComponent('name = "e1"'), schema + " Entities"],
        ["/#/entities/" + schema + "/add", "Add a new entity of type " + schema],
        ["/#/entities/" + schema + "/edit/" + entity._id, "Modify entity of type " + schema + " - e1"],
        ["/#/entities/" + schema + "/view/" + entity._id, "View entity e1 of type " + schema],
        ["/#/hooks", "Hooks"],
        ["/#/hooks/add", "Add a new hook"],
        ["/#/hooks/edit/" + hook, "Modify hook " + hook],
        ["/#/hooks/view/" + hook, "View hook " + hook],
        ["/#/scripts", "Scripts"],
        ["/#/scripts/add", "Add a new script"],
        ["/#/scripts/edit/" + script, "Modify script " + script],
        ["/#/scripts/view/" + script, "View script " + script],
        ["/#/users", "SIS Users"],
        ["/#/tokens", "Tokens"],
        ["/#/commits/entities/" + schema + "/" + entity._id, "Commits for " + schema + " " + entity._id],
        ["/#/commits/schemas/" + schema, "Commits for schemas " + schema],
        ["/#/commits/hooks/" + hook, "Commits for hooks " + hook],
        ["/#/commits/scripts/" + script, "Commits for scripts " + script],
        ["/#/docs/schemas", "Schema API"]
    ];
    for (var r of routes) {
        await test.step(r[0], async function() {
            await page.goto(r[0]);
            await expect(page.getByRole("heading", { name: r[1], exact: true }).first()).toBeVisible();
            expect(new URL(page.url()).hash).toBe(r[0].slice(1));
        });
    }
});

test("the login page can be opened from a direct link", async function({ page }) {
    await page.goto("/#/login");
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
    await expect(page).toHaveURL(/#\/login$/);
});

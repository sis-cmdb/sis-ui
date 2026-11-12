"use strict";

var { test, expect } = require("./fixtures");
var pages = require("./support/pages");

test.describe("hooks", function() {
    test("the list shows hooks with their entity type and owners", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("hooked");
        var hook = uniqueName("hook");
        await api.createSchema({ name: schema, definition: { a: "String" } });
        await api.createHook({ name: hook, entity_type: schema, events: ["insert"],
                               target: { action: "POST", url: "http://127.0.0.1:9/hook" } });
        await signIn(page);
        await page.goto("/#/hooks");

        var row = pages.tableRow(page, hook);
        await expect(row.getByRole("link", { name: schema })).toHaveAttribute("href", "#/entities/" + schema);
        await expect(row.locator(".label")).toHaveText(["e2e"]);
        await row.getByRole("link", { name: hook }).click();
        await expect(pages.entityInput(page, "name")).toHaveValue(hook);
        await expect(pages.entityInput(page, "url")).toHaveValue("http://127.0.0.1:9/hook");
    });

    test("a new hook can be created from the form", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("hooked");
        var hook = uniqueName("hook");
        await api.createSchema({ name: schema, definition: { a: "String" } });
        await signIn(page);
        await page.goto("/#/hooks");
        await page.getByRole("button", { name: "Add New" }).click();

        await pages.entityInput(page, "entity_type").fill(schema);
        await pages.entityInput(page, "name").fill(hook);
        await pages.entityInput(page, "action").selectOption("POST");
        await pages.entityInput(page, "url").fill("http://127.0.0.1:9/created");
        await pages.entityGroup(page, "events").getByLabel("update", { exact: true }).check();
        await pages.entityInput(page, "owner", "SIS fields").fill("e2e");
        api.created.push("/hooks/" + hook);
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(/#\/hooks$/);
        await expect(pages.tableRow(page, hook)).toBeVisible();
        var saved = await api.get("/hooks/" + hook);
        expect(saved).toMatchObject({ entity_type: schema, events: ["update"],
                                      target: { action: "POST", url: "http://127.0.0.1:9/created" } });
    });

    test("removing a hook asks for confirmation", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("hooked");
        var hook = uniqueName("hook");
        await api.createSchema({ name: schema, definition: { a: "String" } });
        await api.createHook({ name: hook, entity_type: schema, events: ["delete"],
                               target: { action: "GET", url: "http://127.0.0.1:9/x" } });
        await signIn(page);
        await page.goto("/#/hooks");

        await pages.tableRow(page, hook).getByRole("link", { name: "Remove" }).click();
        await pages.confirmDialog(page, "Are you sure you want to delete " + hook);
        await expect(pages.tableRow(page, hook)).toHaveCount(0);
        await expect(api.get("/hooks/" + hook)).rejects.toMatchObject({ status: 404 });
    });

    test("the history page shows what changed in a hook", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("hooked");
        var hook = uniqueName("hook");
        await api.createSchema({ name: schema, definition: { a: "String" } });
        var created = await api.createHook({ name: hook, entity_type: schema, events: ["insert"],
                                             target: { action: "GET", url: "http://127.0.0.1:9/v1" } });
        created.target.url = "http://127.0.0.1:9/v2";
        await api.put("/hooks/" + hook, created);
        await signIn(page);
        await page.goto("/#/hooks");

        await pages.tableRow(page, hook).getByRole("link", { name: "History" }).click();
        await expect(page.getByRole("heading", { name: "Commits for hooks " + hook })).toBeVisible();
        var commits = page.locator(".panel");
        await expect(commits).toHaveCount(2);
        await commits.nth(0).locator(".panel-heading a").click();
        await expect(commits.nth(0).locator(".jsondiffpatch-modified")).toContainText("url");
        await expect(commits.nth(0)).toContainText("http://127.0.0.1:9/v2");
    });
});

test.describe("scripts", function() {
    test("a script can be written in the code editor and saved", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("script");
        await signIn(page);
        await page.goto("/#/scripts");
        await page.getByRole("button", { name: "Add New" }).click();

        await pages.entityInput(page, "name").fill(name);
        await pages.entityInput(page, "description").fill("says hello");
        await pages.entityInput(page, "owner", "SIS fields").fill("e2e");
        await page.getByRole("link", { name: "Open Editor" }).click();
        await pages.focusCodeEditor(page);
        await page.keyboard.insertText("res.send('hello');");
        await pages.modal(page).getByRole("button", { name: "Save" }).click();
        await expect(pages.modal(page)).toHaveCount(0);
        api.created.push("/scripts/" + name);
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(/#\/scripts$/);
        await expect(pages.tableRow(page, name)).toBeVisible();
        var saved = await api.get("/scripts/" + name);
        expect(saved).toMatchObject({ description: "says hello", script_type: "application/javascript",
                                      script: "res.send('hello');" });
    });

    test("the code editor shows a saved script read only on the view page", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("script");
        await api.createScript({ name: name, script_type: "application/javascript", script: "var x = 1;" });
        await signIn(page);
        await page.goto("/#/scripts");

        await pages.tableRow(page, name).getByRole("link", { name: name }).click();
        await page.getByRole("link", { name: "Open Editor" }).click();
        await expect(pages.modal(page).locator(".ace_content")).toContainText("var x = 1;");
        await expect(pages.modal(page).getByRole("button", { name: "Save" })).toHaveCount(0);
        await pages.modal(page).getByRole("button", { name: "Close" }).click();
        await expect(pages.modal(page)).toHaveCount(0);
    });

    test("the history page shows what changed in a script", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("script");
        var created = await api.createScript({ name: name, script_type: "application/javascript", script: "var v = 1;" });
        created.script = "var v = 2;";
        await api.put("/scripts/" + name, created);
        await signIn(page);
        await page.goto("/#/scripts");

        await pages.tableRow(page, name).getByRole("link", { name: "History" }).click();
        await expect(page).toHaveURL(new RegExp("#/commits/scripts/" + name + "$"));
        await expect(page.getByRole("heading", { name: "Commits for scripts " + name })).toBeVisible();
        var commits = page.locator(".panel");
        await expect(commits).toHaveCount(2);
        await commits.nth(0).locator(".panel-heading a").click();
        await expect(commits.nth(0).locator(".jsondiffpatch-modified")).toContainText("script");
        await commits.nth(1).locator(".panel-heading a").click();
        await expect(commits.nth(1).locator("pre")).toContainText("var v = 1;");
    });
});

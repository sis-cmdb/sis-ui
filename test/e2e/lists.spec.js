"use strict";

// List pages other than entities: filtering hooks, scripts and users, the super
// users dialog and the schema information on the entity list.

var { test, expect, env } = require("./fixtures");
var pages = require("./support/pages");

async function filter(page, query) {
    await page.getByLabel("Filter").fill(query);
    await page.getByRole("button", { name: "Filter", exact: true }).click();
}

test("the hook list can be filtered", async function({ page, api, uniqueName }) {
    var schema = uniqueName("hooked");
    var keep = uniqueName("hook");
    var hide = uniqueName("hook");
    await api.createSchema({ name: schema, definition: { a: "String" } });
    for (var name of [keep, hide]) {
        await api.createHook({ name: name, entity_type: schema, events: ["insert"],
                               target: { action: "GET", url: "http://127.0.0.1:9/x" } });
    }
    await page.goto("/#/hooks");
    await expect(pages.tableRow(page, hide)).toBeVisible();

    await filter(page, "name = \"" + keep + "\"");
    await expect(pages.tableRow(page, keep)).toBeVisible();
    await expect(pages.tableRow(page, hide)).toHaveCount(0);
    await expect(page).toHaveURL(/[?&]q=/);
});

test("the script list can be filtered", async function({ page, api, uniqueName }) {
    var keep = uniqueName("script");
    var hide = uniqueName("script");
    for (var name of [keep, hide]) {
        await api.createScript({ name: name, script_type: "application/javascript", script: "1;" });
    }
    await page.goto("/#/scripts");
    await expect(pages.tableRow(page, hide)).toBeVisible();

    await filter(page, "name = \"" + keep + "\"");
    await expect(pages.tableRow(page, keep)).toBeVisible();
    await expect(pages.tableRow(page, hide)).toHaveCount(0);
});

test("the user list can be filtered", async function({ page, createUser, signIn }) {
    var keep = await createUser();
    var hide = await createUser();
    await signIn(page);
    await page.goto("/#/users");
    await expect(pages.tableRow(page, hide.name)).toBeVisible();

    await filter(page, "name = \"" + keep.name + "\"");
    await expect(pages.tableRow(page, keep.name)).toBeVisible();
    await expect(pages.tableRow(page, hide.name)).toHaveCount(0);
});

test("clicking Super User lists the super users", async function({ page, signIn }) {
    await signIn(page);
    await page.goto("/#/users");

    await pages.tableRow(page, env.ADMIN.name).getByText("Super User", { exact: true }).click();
    var dlg = pages.modal(page);
    await expect(dlg.getByRole("heading", { name: "Super Users" })).toBeVisible();
    await expect(pages.tableRow(dlg, env.ADMIN.name)).toBeVisible();
    await expect(dlg.locator("tbody .label-success")).not.toHaveCount(0);
});

test("the entity list shows the schema's fields, JSON and admins", async function({ page, api, createUser, uniqueName }) {
    var group = uniqueName("grp");
    var admin = await createUser({ roles: { [group]: "admin" } });
    var schema = uniqueName("info");
    await api.createSchema({ name: schema, description: "About hosts", _sis: { owner: [group] },
                             definition: { hostname: { type: "String", required: true }, cpus: "Number" } });
    await page.goto("/#/entities/" + schema);

    await expect(page.getByRole("heading", { name: schema + " Information About hosts" })).toBeVisible();
    await page.getByRole("link", { name: "Definition Fields" }).click();
    var fields = page.locator(".panel").filter({ hasText: "Definition Fields" });
    var hostname = fields.locator("li").filter({ hasText: "hostname" });
    await expect(hostname.getByText("String", { exact: true })).toBeVisible();
    await expect(hostname.getByText("required", { exact: true })).toBeVisible();
    var cpus = fields.locator("li").filter({ hasText: "cpus" });
    await expect(cpus.getByText("Number", { exact: true })).toBeVisible();
    await expect(cpus.getByText("required", { exact: true })).toBeHidden();

    await page.getByRole("link", { name: "JSON" }).click();
    var json = page.locator(".panel").filter({ hasText: "JSON" }).locator("pre");
    await expect(json).toBeVisible();
    await expect(json).toContainText("\"description\": \"About hosts\"");

    await page.getByRole("link", { name: "Admins" }).click();
    var admins = page.locator(".panel").filter({ hasText: "Admins" });
    await expect(pages.tableRow(admins, admin.name)).toBeVisible();
});

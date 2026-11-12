"use strict";

var { test, expect, env } = require("./fixtures");
var pages = require("./support/pages");

test.describe("users", function() {
    test("the list shows each user's roles", async function({ page, createUser, signIn }) {
        var user = await createUser({ roles: { ops: "admin", dev: "user" } });
        await signIn(page);
        await page.goto("/#/users");

        var row = pages.tableRow(page, user.name);
        await expect(row.locator(".label-primary")).toHaveText("ops");
        await expect(row.locator(".label-default")).toHaveText("dev");
        await expect(pages.tableRow(page, env.ADMIN.name).locator(".label-success")).toHaveText("Super User");
    });

    test("a super user can change another user's roles", async function({ page, api, createUser, signIn }) {
        var user = await createUser({ roles: { ops: "user" } });
        await signIn(page);
        await page.goto("/#/users");

        await pages.tableRow(page, user.name).getByRole("link", { name: "Edit" }).click();
        var dlg = pages.modal(page);
        await expect(dlg.getByRole("heading", { name: "Edit permissions for " + user.name })).toBeVisible();
        await expect(dlg.getByRole("button", { name: "Save" })).toBeDisabled();
        await dlg.getByLabel("ops", { exact: true }).selectOption("admin");
        await dlg.getByPlaceholder("group").fill("qa");
        await dlg.getByRole("link", { name: "Add" }).click();
        await dlg.getByRole("button", { name: "Save" }).click();
        await expect(dlg).toHaveCount(0);

        var row = pages.tableRow(page, user.name);
        await expect(row.locator(".label")).toHaveText(["ops", "qa"]);
        expect((await api.get("/users/" + user.name)).roles).toEqual({ ops: "admin", qa: "user" });
    });

    test("clicking a group shows the users in it", async function({ page, uniqueName, createUser, signIn }) {
        var group = uniqueName("grp");
        var a = await createUser({ roles: { [group]: "admin" } });
        var b = await createUser({ roles: { [group]: "user" } });
        await signIn(page);
        await page.goto("/#/users");

        await pages.tableRow(page, a.name).locator(".label", { hasText: group }).click();
        var dlg = pages.modal(page);
        await expect(dlg.getByRole("heading", { name: "Users belonging to " + group })).toBeVisible();
        await expect(dlg.locator("tbody tr td:first-child")).toHaveText([a.name, b.name]);
    });

    test("users without admin roles cannot edit anyone", async function({ page, createUser, signIn }) {
        var user = await createUser({ roles: { e2e: "user" } });
        await signIn(page, user);
        await page.goto("/#/users");

        await expect(pages.tableRow(page, user.name).locator(".glyphicon-lock")).toBeVisible();
        await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
    });
});

test.describe("tokens", function() {
    test("a user with roles can create and remove persistent tokens", async function({ page, api, createUser, signIn }) {
        var user = await createUser({ roles: { e2e: "user" } });
        await signIn(page, user);
        await page.goto("/#/tokens");

        await expect(page.getByRole("button", { name: "Add New" })).toBeDisabled();
        await page.getByPlaceholder("Description").fill("ci pipeline");
        await page.getByRole("button", { name: "Add New" }).click();
        var row = pages.tableRow(page, "ci pipeline");
        await expect(row).toBeVisible();
        var tokens = await api.get("/users/" + user.name + "/tokens");
        expect(tokens.map(function(t) { return t.desc; })).toEqual(["ci pipeline"]);

        await row.getByRole("link", { name: "Remove" }).click();
        await pages.confirmDialog(page);
        await expect(row).toHaveCount(0);
        expect(await api.get("/users/" + user.name + "/tokens")).toEqual([]);
    });

    test("the current login session is listed", async function({ page, createUser, signIn }) {
        var user = await createUser();
        await signIn(page, user);
        await page.goto("/#/tokens");

        var temps = page.locator("table").first();
        await expect(temps.locator("tbody tr")).toHaveCount(1);
        await expect(temps.locator("tbody tr td").first()).toHaveText("Login session");
        await expect(temps.locator("tbody tr .label")).toHaveText("Current Token");
        await expect(temps.locator("tbody tr")).toContainText("in 8 hours");
    });

    test("super users are told they cannot create persistent tokens", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/tokens");
        await expect(page.getByText("Super users or users without any roles cannot create persistent tokens yet.")).toBeVisible();
        await expect(page.getByPlaceholder("Description")).toHaveCount(0);
    });

    test("the tokens page is reached from the user menu", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/schemas");
        await page.locator("header .dropdown-toggle", { hasText: env.ADMIN.name }).click();
        await page.getByRole("link", { name: "Manage Tokens" }).click();
        await expect(page.getByRole("heading", { name: "Tokens", exact: true })).toBeVisible();
    });
});

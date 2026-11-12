"use strict";

var { test, expect } = require("./fixtures");
var pages = require("./support/pages");

test.describe("schemas", function() {
    test("the list shows each schema with its owners and entity count", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("host");
        await api.createSchema({ name: name, _sis: { owner: ["ops", "dba"] }, definition: { hostname: "String" } });
        await api.createEntity(name, { hostname: "a" });
        await api.createEntity(name, { hostname: "b" });

        await signIn(page);
        await page.goto("/#/schemas");

        var row = pages.tableRow(page, name);
        await expect(row.locator(".badge")).toHaveText("2");
        // the API keeps owners sorted
        await expect(row.locator(".label")).toHaveText(["dba", "ops"]);
        await expect(row.getByRole("link", { name: name })).toHaveAttribute("href", "#/entities/" + name);
    });

    test("the filter box narrows the list by name", async function({ page, api, uniqueName }) {
        var keep = uniqueName("keep");
        var hide = uniqueName("hide");
        await api.createSchema({ name: keep, definition: { a: "String" } });
        await api.createSchema({ name: hide, definition: { a: "String" } });

        await page.goto("/#/schemas");
        await expect(pages.tableRow(page, hide)).toBeVisible();
        await page.getByPlaceholder("Filter").fill(keep);

        await expect(pages.tableRow(page, keep)).toBeVisible();
        await expect(pages.tableRow(page, hide)).toHaveCount(0);
    });

    test("a new schema can be created from the form", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("svc");
        await signIn(page);
        await page.goto("/#/schemas");
        await page.getByRole("button", { name: "Add New" }).click();
        await expect(page.getByRole("heading", { name: "Add a new schema" })).toBeVisible();

        await pages.schemaValue(page, "name").fill(name);
        await pages.schemaValue(page, "description").fill("Services we run");
        await pages.schemaValue(page, "owner", "SIS fields").fill("e2e");
        await pages.definitionNames(page).nth(0).fill("svcname");
        await pages.form(page).getByRole("link", { name: "Add" }).last().click();
        await pages.definitionNames(page).nth(1).fill("port");
        await pages.definitionTypes(page).nth(1).selectOption("Number");
        api.created.push("/schemas/" + name);
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(/#\/schemas$/);
        await expect(pages.tableRow(page, name)).toBeVisible();
        var saved = await api.get("/schemas/" + name);
        expect(saved.description).toBe("Services we run");
        expect(saved.definition).toEqual({ svcname: "String", port: "Number" });
        expect(saved._sis.owner).toEqual(["e2e"]);
    });

    test("save is disabled until the required fields are filled in", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/schemas/add");
        await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
        await expect(pages.schemaValue(page, "name")).toBeEmpty();
        expect(await pages.isValid(pages.schemaValue(page, "name"))).toBe(false);
    });

    test("an existing schema can be edited", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("app");
        await api.createSchema({ name: name, description: "before", definition: { a: "String" } });
        await signIn(page);
        await page.goto("/#/schemas");

        await pages.tableRow(page, name).getByRole("link", { name: "Edit" }).click();
        await expect(page.getByRole("heading", { name: "Modify schema " + name })).toBeVisible();
        await expect(pages.schemaValue(page, "name")).toBeDisabled();
        await pages.schemaValue(page, "description").fill("after");
        await pages.form(page).getByRole("link", { name: "Add" }).last().click();
        await pages.definitionNames(page).last().fill("b");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(/#\/schemas$/);
        var saved = await api.get("/schemas/" + name);
        expect(saved.description).toBe("after");
        expect(saved.definition).toEqual({ a: "String", b: "String" });
    });

    test("removing a schema asks for confirmation", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("tmp");
        await api.createSchema({ name: name, definition: { a: "String" } });
        await signIn(page);
        await page.goto("/#/schemas");
        var row = pages.tableRow(page, name);

        await row.getByRole("link", { name: "Remove" }).click();
        await expect(pages.modal(page)).toContainText("Are you sure you want to delete " + name);
        await pages.modal(page).getByRole("button", { name: "Cancel" }).click();
        await expect(pages.modal(page)).toHaveCount(0);
        await expect(row).toBeVisible();
        await api.get("/schemas/" + name);

        await row.getByRole("link", { name: "Remove" }).click();
        await pages.confirmDialog(page);
        await expect(row).toHaveCount(0);
        await expect(api.get("/schemas/" + name)).rejects.toMatchObject({ status: 404 });
    });

    test("the history page lists the changes made to a schema", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("hist");
        await api.createSchema({ name: name, description: "v1", definition: { a: "String" } });
        await api.put("/schemas/" + name, { name: name, description: "v2", definition: { a: "String" }, _sis: { owner: ["e2e"] } });
        await signIn(page);
        await page.goto("/#/schemas");

        await pages.tableRow(page, name).getByRole("link", { name: "History" }).click();
        await expect(page.getByRole("heading", { name: "Commits for schemas " + name })).toBeVisible();
        var commits = page.locator(".panel");
        await expect(commits).toHaveCount(2);
        // newest first: the update shows a diff of the description
        await commits.nth(0).locator(".panel-heading a").click();
        await expect(commits.nth(0).locator(".jsondiffpatch-modified")).toContainText("description");
        await expect(commits.nth(0)).toContainText("v1");
        await expect(commits.nth(0)).toContainText("v2");
        await commits.nth(1).locator(".panel-heading a").click();
        await expect(commits.nth(1).locator(".glyphicon-plus")).toBeVisible();
    });

    test("visitors who are not logged in cannot change schemas", async function({ page, api, uniqueName }) {
        var name = uniqueName("ro");
        await api.createSchema({ name: name, definition: { a: "String" } });
        await page.goto("/#/schemas");

        var row = pages.tableRow(page, name);
        await expect(row.locator(".glyphicon-lock")).toBeVisible();
        await expect(row.getByRole("link", { name: "Edit" })).toBeHidden();
        await expect(row.getByRole("link", { name: "Remove" })).toBeHidden();
        await expect(page.getByRole("button", { name: "Add New" })).toBeHidden();
    });
});

"use strict";

// The schema definition editor on the schema add/edit page: field types,
// attributes (the per field dialog), nested documents and validation.

var { test, expect } = require("./fixtures");
var pages = require("./support/pages");

async function startNewSchema(page, name) {
    await page.goto("/#/schemas/add");
    await pages.schemaValue(page, "name").fill(name);
    await pages.schemaValue(page, "owner", "SIS fields").fill("e2e");
}

// a new schema starts with one field (called "name"), which the first call
// renames; later calls add a field at the end
async function addField(page, name, type, first) {
    var names = pages.definitionNames(page);
    var count = await names.count();
    if (!first) {
        await pages.form(page).getByRole("link", { name: "Add" }).last().click();
        await expect(names).toHaveCount(count + 1);
    }
    var idx = first ? 0 : count;
    await names.nth(idx).fill(name);
    if (type) {
        await pages.definitionTypes(page).nth(idx).selectOption(type);
    }
    return idx;
}

// opens the attributes dialog of the idx-th field, lets fill() change it and
// confirms with Ok
async function setAttributes(page, idx, fill) {
    await pages.form(page).getByRole("button", { name: "Field attributes" }).nth(idx).click();
    var dlg = pages.modal(page);
    await expect(dlg.getByRole("heading")).toContainText("Attributes");
    await fill(dlg);
    await dlg.getByRole("button", { name: "Ok" }).click();
    await expect(dlg).toHaveCount(0);
}

test.describe("schema editor", function() {
    test("field attributes, nested documents and references are saved", async function({ page, api, signIn, uniqueName }) {
        var target = uniqueName("target");
        var name = uniqueName("full");
        await api.createSchema({ name: target, definition: { a: "String" } });
        await signIn(page);
        await startNewSchema(page, name);

        var host = await addField(page, "hostname", null, true);
        await setAttributes(page, host, async function(dlg) {
            await dlg.getByLabel("required", { exact: true }).check();
            await dlg.getByLabel("unique", { exact: true }).check();
        });
        var env = await addField(page, "env");
        await setAttributes(page, env, async function(dlg) {
            await dlg.getByLabel("enum", { exact: true }).fill("prod, dev");
        });
        var cpus = await addField(page, "cpus", "Number");
        await setAttributes(page, cpus, async function(dlg) {
            await dlg.getByLabel("min", { exact: true }).fill("1");
            await dlg.getByLabel("max", { exact: true }).fill("64");
        });
        var ref = await addField(page, "target", "ObjectId");
        await setAttributes(page, ref, async function(dlg) {
            await dlg.getByLabel("ref", { exact: true }).selectOption(target);
        });
        var location = await addField(page, "location", "Document");
        // a document starts with one child field (called "field")
        await expect(pages.definitionNames(page).nth(location + 1)).toHaveValue("field");
        await pages.definitionNames(page).nth(location + 1).fill("rack");

        api.created.push("/schemas/" + name);
        await page.getByRole("button", { name: "Save" }).click();
        await expect(page).toHaveURL(/#\/schemas$/);

        var saved = await api.get("/schemas/" + name);
        expect(saved.definition).toEqual({
            hostname: { type: "String", required: true, unique: true },
            env: { type: "String", enum: ["prod", "dev"] },
            cpus: { type: "Number", min: 1, max: 64 },
            target: { type: "ObjectId", ref: target },
            location: { rack: "String" }
        });
    });

    test("an error from the API is shown in a dialog and the form is kept", async function({ page, api, signIn, uniqueName, pageErrors }) {
        var name = uniqueName("taken");
        await api.createSchema({ name: name, definition: { a: "String" } });
        pageErrors.allow(/the server responded with a status of 409/);
        await signIn(page);
        await startNewSchema(page, name);
        await addField(page, "b", null, true);
        await page.getByRole("button", { name: "Save" }).click();

        var dlg = pages.modal(page);
        await expect(dlg.getByRole("heading")).toHaveText("An error occurred");
        await expect(dlg.locator(".modal-body")).toHaveText("Conflict: name \"" + name + "\" already exists");
        await dlg.getByRole("button", { name: "OK" }).click();
        await expect(dlg).toHaveCount(0);
        await expect(page).toHaveURL(/#\/schemas\/add$/);
        await expect(pages.schemaValue(page, "name")).toHaveValue(name);
        expect((await api.get("/schemas/" + name)).definition).toEqual({ a: "String" });
    });

    test("toggle JSON shows the schema being edited", async function({ page, signIn, uniqueName }) {
        var name = uniqueName("json");
        await signIn(page);
        await startNewSchema(page, name);
        await addField(page, "port", "Number", true);

        await page.getByRole("button", { name: "Toggle JSON" }).click();
        var json = page.locator("pre");
        await expect(json).toContainText("\"name\": \"" + name + "\"");
        await expect(json).toContainText("\"port\": \"Number\"");
        await page.getByRole("button", { name: "Toggle JSON" }).click();
        await expect(json).toHaveCount(0);
    });

    test("fields with the same name keep the schema from being saved", async function({ page, signIn, uniqueName }) {
        await signIn(page);
        await startNewSchema(page, uniqueName("dupe"));
        await addField(page, "a", null, true);
        await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();

        await addField(page, "a");
        await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
        await pages.definitionNames(page).last().fill("b");
        await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
    });

    test("an invalid regex cannot be set as a match attribute", async function({ page, signIn, uniqueName }) {
        await signIn(page);
        await startNewSchema(page, uniqueName("regex"));
        await addField(page, "a", null, true);
        await pages.form(page).getByRole("button", { name: "Field attributes" }).first().click();
        var dlg = pages.modal(page);
        var match = dlg.getByLabel("match", { exact: true });

        await match.fill("/[a-z/");
        await expect(match).toHaveAccessibleDescription("Not a valid regular expression");
        await expect(dlg.getByRole("button", { name: "Ok" })).toBeDisabled();
        await match.fill("/^[a-z]+$/");
        await expect(match).toHaveAccessibleDescription("");
        await expect(dlg.getByRole("button", { name: "Ok" })).toBeEnabled();
        await dlg.getByRole("button", { name: "Cancel" }).click();
        await expect(dlg).toHaveCount(0);
    });

    test("a minimum above the maximum cannot be set", async function({ page, signIn, uniqueName }) {
        await signIn(page);
        await startNewSchema(page, uniqueName("minmax"));
        await addField(page, "n", "Number", true);
        await pages.form(page).getByRole("button", { name: "Field attributes" }).first().click();
        var dlg = pages.modal(page);
        var min = dlg.getByLabel("min", { exact: true });
        var max = dlg.getByLabel("max", { exact: true });

        await min.fill("10");
        await max.fill("5");
        await expect(min).toHaveAccessibleDescription("Must not be more than max");
        await expect(max).toHaveAccessibleDescription("Must not be less than min");
        await expect(dlg.getByRole("button", { name: "Ok" })).toBeDisabled();
        await max.fill("50");
        await expect(min).toHaveAccessibleDescription("");
        await expect(max).toHaveAccessibleDescription("");
        await expect(dlg.getByRole("button", { name: "Ok" })).toBeEnabled();
    });

    test("removing a saved field asks for confirmation", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("rm");
        await api.createSchema({ name: name, definition: { keep: "String", drop: "Number" } });
        await signIn(page);
        await page.goto("/#/schemas/edit/" + name);
        // saved fields cannot be renamed, only removed
        var remove = pages.form(page).getByRole("link", { name: "Remove field" });
        await expect(remove).toHaveCount(2);
        await expect(pages.definitionNames(page)).toHaveCount(0);

        await pages.form(page).getByRole("link", { name: "Remove field drop", exact: true }).click();
        await pages.confirmDialog(page, "Are you sure you want to delete field 'drop'");
        await expect(remove).toHaveCount(1);
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(/#\/schemas$/);
        expect((await api.get("/schemas/" + name)).definition).toEqual({ keep: "String" });
    });

    test("lock all locks every field, including nested ones", async function({ page, api, signIn, uniqueName }) {
        var name = uniqueName("lock");
        await api.createSchema({ name: name, definition: { a: "String", doc: { b: "Number" } } });
        await signIn(page);
        await page.goto("/#/schemas/edit/" + name);

        await page.getByRole("button", { name: "Lock All" }).click();
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(/#\/schemas$/);
        expect((await api.get("/schemas/" + name)).locked_fields.sort()).toEqual(["a", "doc", "doc.b"]);
    });
});

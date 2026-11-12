"use strict";

// The entity add/edit form beyond plain fields: references to other entities,
// JSON (Mixed) fields, array items and errors from the API.

var { test, expect } = require("./fixtures");
var pages = require("./support/pages");

async function createSchemas(api, uniqueName) {
    var rack = uniqueName("rack");
    var host = uniqueName("host");
    await api.createSchema({ name: rack, id_field: "name",
                             definition: { name: { type: "String", required: true, unique: true } } });
    await api.createSchema({ name: host, id_field: "hostname", definition: {
        hostname: { type: "String", required: true, unique: true },
        rack: { type: "ObjectId", ref: rack },
        data: "Mixed",
        tags: ["String"],
        disks: [{ dev: "String", size: "Number" }]
    } });
    return { rack: rack, host: host };
}

async function entityByHostname(api, schema, hostname) {
    var found = await api.get("/entities/" + schema + "?q=" + encodeURIComponent(JSON.stringify({ hostname: hostname })));
    return found[0];
}

test.describe("entity editor", function() {
    test("a reference is chosen from a list of the referenced entities", async function({ page, api, signIn, uniqueName }) {
        var s = await createSchemas(api, uniqueName);
        await api.createEntity(s.rack, { name: "r1" });
        var r2 = await api.createEntity(s.rack, { name: "r2" });
        await signIn(page);
        await page.goto("/#/entities/" + s.host + "/add");
        await pages.entityInput(page, "hostname").fill("h1");

        var rack = pages.entityInput(page, "rack");
        await expect(rack).toBeDisabled();
        await expect(rack).toHaveAttribute("placeholder", "ObjectId (" + s.rack + ")");
        await page.getByRole("button", { name: "Choose" }).click();
        var dlg = pages.modal(page);
        await expect(dlg.getByRole("heading")).toHaveText("Choose an entity of type " + s.rack);
        await expect(dlg.locator("tbody tr")).toHaveCount(2);
        await pages.tableRow(dlg, "r2").getByRole("link", { name: "Select" }).click();
        await expect(dlg).toHaveCount(0);
        await expect(rack).toHaveValue("r2");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(new RegExp("#/entities/" + s.host + "$"));
        var saved = await entityByHostname(api, s.host, "h1");
        expect(saved.rack._id || saved.rack).toBe(r2._id);

        // the view page shows the reference by its id field and links to it
        await pages.tableRow(page, "h1").getByRole("link", { name: "h1" }).click();
        await expect(pages.entityInput(page, "rack")).toHaveValue("r2");
        await page.getByRole("link", { name: "View", exact: true }).click();
        await expect(page.getByRole("heading", { name: "View entity r2 of type " + s.rack })).toBeVisible();
    });

    test("a reference can be cleared", async function({ page, api, signIn, uniqueName }) {
        var s = await createSchemas(api, uniqueName);
        var r1 = await api.createEntity(s.rack, { name: "r1" });
        var host = await api.createEntity(s.host, { hostname: "h1", rack: r1._id });
        await signIn(page);
        await page.goto("/#/entities/" + s.host + "/edit/" + host._id);

        await expect(pages.entityInput(page, "rack")).toHaveValue("r1");
        await page.getByRole("button", { name: "Choose" }).click();
        await pages.modal(page).getByRole("button", { name: "Clear Choice" }).click();
        await expect(pages.entityInput(page, "rack")).toHaveValue("");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(new RegExp("#/entities/" + s.host + "$"));
        expect((await entityByHostname(api, s.host, "h1")).rack).toBeFalsy();
    });

    test("a JSON field is edited in the code editor", async function({ page, api, signIn, uniqueName }) {
        var s = await createSchemas(api, uniqueName);
        await signIn(page);
        await page.goto("/#/entities/" + s.host + "/add");
        await pages.entityInput(page, "hostname").fill("json1");

        await page.getByRole("link", { name: "Open Editor" }).click();
        var dlg = pages.modal(page);
        await expect(dlg.getByRole("heading")).toHaveText("Code Editor");
        await pages.focusCodeEditor(page);
        await page.keyboard.press("ControlOrMeta+a");
        await page.keyboard.insertText("{ \"a\": [1, 2], \"b\": { \"c\": true } }");
        await dlg.getByRole("button", { name: "Save" }).click();
        await expect(dlg).toHaveCount(0);
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(new RegExp("#/entities/" + s.host + "$"));
        expect((await entityByHostname(api, s.host, "json1")).data).toEqual({ a: [1, 2], b: { c: true } });
    });

    test("array items can be removed and documents added to arrays", async function({ page, api, signIn, uniqueName }) {
        var s = await createSchemas(api, uniqueName);
        var host = await api.createEntity(s.host, { hostname: "arr", tags: ["a", "b", "c"] });
        await signIn(page);
        await page.goto("/#/entities/" + s.host + "/edit/" + host._id);

        var tags = pages.entityGroup(page, "tags");
        await expect(tags.getByRole("textbox")).toHaveCount(3);
        // the remove button sits next to the item's label
        await tags.locator("li").filter({ has: page.getByLabel("1", { exact: true }) })
            .getByRole("link").first().click();
        await expect(tags.getByRole("textbox")).toHaveCount(2);
        await expect(tags.getByLabel("0", { exact: true })).toHaveValue("a");
        await expect(tags.getByLabel("1", { exact: true })).toHaveValue("c");

        var disks = pages.entityGroup(page, "disks");
        await disks.getByRole("link", { name: "Add" }).last().click();
        await disks.getByLabel("dev", { exact: true }).fill("sda");
        await disks.getByLabel("size", { exact: true }).fill("512");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(new RegExp("#/entities/" + s.host + "$"));
        var saved = await entityByHostname(api, s.host, "arr");
        expect(saved.tags).toEqual(["a", "c"]);
        expect(saved.disks).toEqual([expect.objectContaining({ dev: "sda", size: 512 })]);
    });

    test("toggle JSON shows the entity on the view page", async function({ page, api, signIn, uniqueName }) {
        var s = await createSchemas(api, uniqueName);
        var host = await api.createEntity(s.host, { hostname: "j", tags: ["x"] });
        await signIn(page);
        await page.goto("/#/entities/" + s.host + "/view/" + host._id);

        await page.getByRole("button", { name: "Toggle JSON" }).click();
        await expect(page.locator("pre")).toContainText("\"hostname\": \"j\"");
        await expect(page.locator("pre")).toContainText("\"_id\": \"" + host._id + "\"");
    });
});

"use strict";

var { test, expect } = require("./fixtures");
var pages = require("./support/pages");

// Entities created through the UI are not tracked by the api fixture; deleting
// their schema at cleanup deletes them too.
async function createHostSchema(api, name) {
    return api.createSchema({
        name: name,
        description: "Hosts",
        id_field: "hostname",
        definition: {
            hostname: { type: "String", required: true, unique: true },
            ip: "IpAddress",
            cpus: "Number",
            active: "Boolean",
            env: { type: "String", enum: ["prod", "stage", "dev"] },
            location: { rack: "String" },
            tags: ["String"],
            notes: "String"
        }
    });
}

async function entityByHostname(api, schema, hostname) {
    var found = await api.get("/entities/" + schema + "?q=" + encodeURIComponent(JSON.stringify({ hostname: hostname })));
    return found[0];
}

test.describe("entities", function() {
    test("the list shows entities by their id field and links to a read only view", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await api.createEntity(schema, { hostname: "web1", ip: "10.1.2.3", cpus: 4, active: true, env: "stage",
                                         location: { rack: "r7" }, tags: ["web", "edge"] });
        await signIn(page);
        await page.goto("/#/schemas");
        await page.getByRole("link", { name: schema, exact: true }).click();

        await expect(page.getByRole("heading", { name: schema + " Entities" })).toBeVisible();
        await expect(page.locator("[st-table=entities] th").first()).toHaveText("hostname");
        await pages.tableRow(page, "web1").getByRole("link", { name: "web1" }).click();

        await expect(page.getByRole("heading", { name: "View entity web1 of type " + schema })).toBeVisible();
        await expect(pages.entityInput(page, "hostname", "entityView")).toHaveValue("web1");
        await expect(pages.entityInput(page, "hostname", "entityView")).toBeDisabled();
        await expect(pages.entityInput(page, "ip", "entityView")).toHaveValue("10.1.2.3/32");
        await expect(pages.entityInput(page, "cpus", "entityView")).toHaveValue("4");
        await expect(pages.entityInput(page, "active", "entityView")).toBeChecked();
        await expect(pages.entityInput(page, "env", "entityView")).toHaveText(/stage/);
        await expect(pages.entityInput(page, "rack", "entityView")).toHaveValue("r7");
        await expect(pages.entityInput(page, "0", "entityView")).toHaveValue("web");
        await expect(pages.entityInput(page, "1", "entityView")).toHaveValue("edge");
    });

    test("a new entity can be added from the form", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await signIn(page);
        await page.goto("/#/entities/" + schema);
        await page.getByRole("button", { name: "Add New" }).click();

        await pages.entityInput(page, "hostname").fill("db1");
        await pages.entityInput(page, "ip").fill("192.168.0.10");
        await pages.entityInput(page, "cpus").fill("16");
        await pages.entityInput(page, "active").check();
        await pages.entityInput(page, "env").selectOption("dev");
        await pages.entityInput(page, "rack").fill("r2");
        await pages.entityInput(page, "notes").fill("primary database");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(new RegExp("#/entities/" + schema + "$"));
        await expect(pages.tableRow(page, "db1")).toBeVisible();
        var saved = await entityByHostname(api, schema, "db1");
        expect(saved).toMatchObject({ hostname: "db1", cpus: 16, active: true, env: "dev",
                                      location: { rack: "r2" }, notes: "primary database" });
        expect(saved.ip.ip_address).toBe("192.168.0.10");
    });

    test("items can be added to array fields", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await signIn(page);
        await page.goto("/#/entities/" + schema + "/add");

        await pages.entityInput(page, "hostname").fill("tagged");
        var addTag = page.locator("form[name=entityMod] li").filter({ has: page.locator("label", { hasText: /^tags$/ }) })
            .getByRole("link", { name: "Add" });
        await addTag.click();
        await pages.entityInput(page, "0").fill("blue");
        await addTag.click();
        await pages.entityInput(page, "1").fill("green");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(pages.tableRow(page, "tagged")).toBeVisible();
        expect((await entityByHostname(api, schema, "tagged")).tags).toEqual(["blue", "green"]);
    });

    test("required fields and invalid addresses keep the form from being saved", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await signIn(page);
        await page.goto("/#/entities/" + schema + "/add");
        var save = page.getByRole("button", { name: "Save" });

        await expect(save).toBeDisabled();
        await expect(pages.entityField(page, "hostname").locator("small")).toHaveText("Required");
        await pages.entityInput(page, "hostname").fill("h1");
        await expect(save).toBeEnabled();

        for (var bad of ["10.0.0.999", "not-an-ip", "2001:db8::zz"]) {
            await pages.entityInput(page, "ip").fill(bad);
            await expect(pages.entityField(page, "ip")).toHaveClass(/has-error/);
            await expect(pages.entityField(page, "ip").locator("small")).toHaveText("Not a valid IP address");
            await expect(save).toBeDisabled();
        }
        for (var good of ["10.0.0.1", "10.0.0.0/24", "2001:db8::1"]) {
            await pages.entityInput(page, "ip").fill(good);
            await expect(pages.entityField(page, "ip")).not.toHaveClass(/has-error/);
            await expect(save).toBeEnabled();
        }
    });

    test("an entity can be edited", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await api.createEntity(schema, { hostname: "app1", cpus: 2 });
        await signIn(page);
        await page.goto("/#/entities/" + schema);

        await pages.tableRow(page, "app1").getByRole("link", { name: "Edit" }).click();
        await expect(pages.entityInput(page, "cpus")).toHaveValue("2");
        await pages.entityInput(page, "cpus").fill("8");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(page).toHaveURL(new RegExp("#/entities/" + schema + "$"));
        expect((await entityByHostname(api, schema, "app1")).cpus).toBe(8);
    });

    test("clone starts a new entity from an existing one", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await api.createEntity(schema, { hostname: "orig", cpus: 6, env: "stage" });
        await signIn(page);
        await page.goto("/#/entities/" + schema);

        await pages.tableRow(page, "orig").getByRole("link", { name: "Clone" }).click();
        await expect(pages.entityInput(page, "cpus")).toHaveValue("6");
        await pages.entityInput(page, "hostname").fill("copy");
        await page.getByRole("button", { name: "Save" }).click();

        await expect(pages.tableRow(page, "copy")).toBeVisible();
        await expect(pages.tableRow(page, "orig")).toBeVisible();
        expect(await entityByHostname(api, schema, "copy")).toMatchObject({ cpus: 6, env: "stage" });
    });

    test("removing an entity asks for confirmation", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await api.createEntity(schema, { hostname: "gone" });
        await signIn(page);
        await page.goto("/#/entities/" + schema);

        await pages.tableRow(page, "gone").getByRole("link", { name: "Remove" }).click();
        await pages.confirmDialog(page, "Are you sure you want to delete gone");

        await expect(pages.tableRow(page, "gone")).toHaveCount(0);
        expect(await entityByHostname(api, schema, "gone")).toBeUndefined();
    });

    test("the history page shows what changed", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        var entity = await api.createEntity(schema, { hostname: "h", cpus: 1 });
        await api.put("/entities/" + schema + "/" + entity._id, { hostname: "h", cpus: 2 });
        await signIn(page);
        await page.goto("/#/entities/" + schema);

        await pages.tableRow(page, "h").getByRole("link", { name: "History" }).click();
        var commits = page.locator(".panel");
        await expect(commits).toHaveCount(2);
        await commits.nth(0).locator(".panel-heading a").click();
        await expect(commits.nth(0).locator(".jsondiffpatch-modified")).toContainText("cpus");
        await commits.nth(1).locator(".panel-heading a").click();
        await expect(commits.nth(1).locator("pre")).toContainText("\"hostname\": \"h\"");
    });

    test("values containing html are shown as text in the history", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        var payload = "<img src=x onerror=\"window.__xss = true\">";
        var entity = await api.createEntity(schema, { hostname: "x", notes: payload });
        await api.put("/entities/" + schema + "/" + entity._id, { hostname: "x", notes: payload + "!" });
        await signIn(page);
        await page.goto("/#/commits/entities/" + schema + "/" + entity._id);

        var commits = page.locator(".panel");
        await expect(commits).toHaveCount(2);
        await commits.nth(0).locator(".panel-heading a").click();
        await commits.nth(1).locator(".panel-heading a").click();
        // the history shows values as JSON
        await expect(commits.nth(1).locator("pre")).toContainText("\"notes\": " + JSON.stringify(payload));
        await expect(commits.nth(0)).toContainText(JSON.stringify(payload + "!"));
        await expect(page.locator(".panel img")).toHaveCount(0);
        expect(await page.evaluate(function() { return globalThis.__xss; })).toBeUndefined();
    });

    test("keys containing html are shown as text in history diffs", async function({ page, api, signIn, uniqueName }) {
        var schema = uniqueName("mixed");
        await api.createSchema({ name: schema, definition: { name: "String", data: "Mixed" } });
        var key = "<img src=x onerror=\"globalThis.__xss = true\">";
        var entity = await api.createEntity(schema, { name: "m", data: { a: 1 } });
        var update = { name: "m", data: { a: 1 } };
        update.data[key] = 2;
        await api.put("/entities/" + schema + "/" + entity._id, update);
        await signIn(page);
        await page.goto("/#/commits/entities/" + schema + "/" + entity._id);

        var commits = page.locator(".panel");
        await expect(commits).toHaveCount(2);
        await commits.nth(0).locator(".panel-heading a").click();
        await expect(commits.nth(0).locator(".jsondiffpatch-added")).toContainText(key);
        await expect(page.locator(".panel img")).toHaveCount(0);
        expect(await page.evaluate(function() { return globalThis.__xss; })).toBeUndefined();
    });

    test("visitors who are not logged in can view but not change entities", async function({ page, api, uniqueName }) {
        var schema = uniqueName("host");
        await createHostSchema(api, schema);
        await api.createEntity(schema, { hostname: "ro" });
        await page.goto("/#/entities/" + schema);

        var row = pages.tableRow(page, "ro");
        await expect(row.locator(".glyphicon-lock")).toBeVisible();
        await expect(row.getByRole("link", { name: "Edit" })).toBeHidden();
        await expect(page.getByRole("button", { name: "Add New" })).toBeHidden();
        await row.getByRole("link", { name: "ro" }).click();
        await expect(pages.entityInput(page, "hostname", "entityView")).toHaveValue("ro");
        await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    });
});

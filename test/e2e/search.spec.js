"use strict";

// The entity list filter box. Queries are parsed in the browser (src/pegjs) into
// SIS query objects; the examples come from the in-app filter reference.

var { test, expect } = require("./fixtures");
var pages = require("./support/pages");

var HOSTS = [
    { name: "web1", cpus: 2, env: "prod" },
    { name: "web2", cpus: 8, env: "prod" },
    { name: "db1", cpus: 16, env: "prod" },
    { name: "db2", cpus: 32, env: "stage" },
    { name: "cache1", cpus: 4, env: "dev" }
];

async function setup(api, uniqueName) {
    var schema = uniqueName("srch");
    await api.createSchema({
        name: schema,
        id_field: "name",
        definition: { name: { type: "String", required: true, unique: true }, cpus: "Number", env: "String" }
    });
    for (var h of HOSTS) {
        await api.createEntity(schema, h);
    }
    return schema;
}

function names(page) {
    return page.getByRole("table").locator("tbody tr td:first-child");
}

// the entities listed, in any order
async function expectNames(page, expected) {
    await expect.poll(async function() {
        return (await names(page).allTextContents()).map(function(t) { return t.trim(); }).sort();
    }).toEqual(expected.slice().sort());
}

async function filter(page, query) {
    await page.getByPlaceholder("Filter").fill(query);
    await page.getByRole("button", { name: "Filter" }).click();
}

test.describe("entity search", function() {
    var schema;
    test.beforeEach(async function({ page, api, uniqueName }) {
        schema = await setup(api, uniqueName);
        await page.goto("/#/entities/" + schema);
        await expect(names(page)).toHaveCount(HOSTS.length);
    });

    var cases = [
        ["field = value", "env = stage", ["db2"]],
        ["a quoted value", "name = \"web1\"", ["web1"]],
        ["no spaces around the operator", "env=dev", ["cache1"]],
        ["a comparison", "cpus > 8", ["db1", "db2"]],
        ["at most", "cpus <= 4", ["web1", "cache1"]],
        ["not equal", "env != prod", ["db2", "cache1"]],
        ["not equal without spaces", "env!=prod", ["db2", "cache1"]],
        ["a case insensitive regex", "name like \"WEB.*\"", ["web1", "web2"]],
        ["and", "cpus > 2 and env = prod", ["web2", "db1"]],
        ["or", "env = stage or env = dev", ["db2", "cache1"]],
        ["a range", "cpus > 2 and cpus < 20", ["web2", "db1", "cache1"]],
        ["parentheses", "(cpus > 10 and cpus < 20) or name = \"web1\"", ["web1", "db1"]],
        ["in", "name in \"web1,db2\"", ["web1", "db2"]],
        ["in with numbers", "cpus in 2,4", ["web1", "cache1"]],
        ["not in", "env nin \"prod,dev\"", ["db2"]]
    ];
    cases.forEach(function(c) {
        test("filters with " + c[0] + ": " + c[1], async function({ page }) {
            await filter(page, c[1]);
            await expectNames(page, c[2]);
        });
    });

    test("an invalid query shows an error and keeps the list", async function({ page }) {
        await filter(page, "cpus >");
        await expect(page.getByText("Invalid query.")).toBeVisible();
        await expect(names(page)).toHaveCount(HOSTS.length);
    });

    test("the query is kept in the URL, so it survives a reload", async function({ page }) {
        await filter(page, "env = prod");
        await expect(names(page)).toHaveCount(3);
        await expect(page).toHaveURL(/q=env%20%3D%20prod/);

        await page.reload();
        await expect(page.getByPlaceholder("Filter")).toHaveValue("env = prod");
        await expect(names(page)).toHaveCount(3);
    });

    test("an empty filter shows everything again", async function({ page }) {
        await filter(page, "env = stage");
        await expect(names(page)).toHaveCount(1);
        await filter(page, "");
        await expect(names(page)).toHaveCount(HOSTS.length);
    });

    test("the help icon opens the filter reference", async function({ page }) {
        await page.locator(".glyphicon-question-sign").click();
        await expect(pages.modal(page).getByRole("heading", { name: "Filter reference" })).toBeVisible();
        await pages.modal(page).getByRole("button", { name: "Close" }).click();
        await expect(pages.modal(page)).toHaveCount(0);
    });
});

test("long entity lists are paged 20 at a time", async function({ page, api, uniqueName }) {
    var schema = uniqueName("page");
    await api.createSchema({ name: schema, id_field: "name", definition: { name: { type: "String", required: true, unique: true } } });
    // bulk insert
    var items = [];
    for (var i = 0; i < 45; ++i) {
        items.push({ name: "item" + String(i).padStart(2, "0") });
    }
    await api.post("/entities/" + schema, items);

    await page.goto("/#/entities/" + schema);
    var rows = names(page);
    await expect(rows).toHaveCount(20);
    var pager = page.locator(".pagination");
    await expect(pager.getByRole("link", { name: "3", exact: true })).toBeVisible();

    await pager.getByRole("link", { name: "3", exact: true }).click();
    await expect(rows).toHaveCount(5);
    await expect(page).toHaveURL(/p=3/);
    await pager.getByRole("link", { name: "First" }).click();
    await expect(rows).toHaveCount(20);
});

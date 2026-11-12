"use strict";

// Users who are not super users pick the owners of what they create from the
// groups they belong to (or administer, for schemas).

var { test, expect } = require("./fixtures");
var pages = require("./support/pages");

test("a group member adds an entity owned by one of their groups", async function({ page, api, createUser, signIn, uniqueName }) {
    var mine = uniqueName("grp");
    var other = uniqueName("grp");
    var user = await createUser({ roles: { [mine]: "user" } });
    var schema = uniqueName("owned");
    await api.createSchema({ name: schema, _sis: { owner: [mine, other] }, any_owner_can_modify: true,
                             definition: { name: { type: "String", required: true, unique: true } } });
    await signIn(page, user);
    await page.goto("/#/entities/" + schema + "/add");

    var owners = pages.entityGroup(page, "owner", "SIS fields");
    // only the schema's owner groups the user is in
    await expect(owners.getByRole("checkbox")).toHaveCount(1);
    await owners.getByLabel(mine, { exact: true }).check();
    await pages.entityInput(page, "name").fill("e1");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL(new RegExp("#/entities/" + schema + "$"));
    var saved = (await api.get("/entities/" + schema + "?q=" + encodeURIComponent(JSON.stringify({ name: "e1" }))))[0];
    expect(saved._sis.owner).toEqual([mine]);
});

test("a group admin creates a schema owned by their group", async function({ page, api, createUser, signIn, uniqueName }) {
    var group = uniqueName("grp");
    var user = await createUser({ roles: { [group]: "admin" } });
    var name = uniqueName("byadmin");
    await signIn(page, user);
    await page.goto("/#/schemas/add");

    var owners = pages.form(page, "SIS fields");
    await expect(owners.getByRole("checkbox", { name: group })).toBeVisible();
    await owners.getByRole("checkbox", { name: group }).check();
    await pages.schemaValue(page, "name").fill(name);
    api.created.push("/schemas/" + name);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL(/#\/schemas$/);
    var saved = await api.get("/schemas/" + name);
    expect(saved._sis.owner).toEqual([group]);
    expect(saved.definition).toEqual({ name: "String" });
});

test("a user with a role creates a hook owned by their group", async function({ page, api, createUser, signIn, uniqueName }) {
    var group = uniqueName("grp");
    var user = await createUser({ roles: { [group]: "user" } });
    var schema = uniqueName("hooked");
    var hook = uniqueName("hook");
    await api.createSchema({ name: schema, definition: { a: "String" } });
    await signIn(page, user);
    await page.goto("/#/hooks/add");

    await pages.entityInput(page, "entity_type").fill(schema);
    await pages.entityInput(page, "name").fill(hook);
    await pages.entityInput(page, "url").fill("http://127.0.0.1:9/x");
    await pages.entityGroup(page, "events").getByLabel("insert", { exact: true }).check();
    await pages.entityGroup(page, "owner", "SIS fields").getByLabel(group, { exact: true }).check();
    api.created.push("/hooks/" + hook);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL(/#\/hooks$/);
    expect((await api.get("/hooks/" + hook))._sis.owner).toEqual([group]);
});

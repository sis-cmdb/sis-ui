"use strict";

var { test, expect, env } = require("./fixtures");
var { SisClient } = require("./support/sis-client");

function navbar(page) {
    return page.locator("header.navbar");
}

async function loginThroughForm(page, user) {
    await page.getByLabel("Username").fill(user.name);
    await page.getByLabel("Password").fill(user.pw);
    await page.getByRole("button", { name: "Login" }).click();
}

async function expectLoggedInAs(page, name) {
    await expect(navbar(page).locator("a.dropdown-toggle", { hasText: name })).toBeVisible();
    await expect(navbar(page).getByRole("link", { name: "Login" })).toHaveCount(0);
}

async function logout(page, name) {
    await navbar(page).locator("a.dropdown-toggle", { hasText: name }).click();
    await navbar(page).locator(".dropdown-menu").getByText("Logout", { exact: true }).click();
    await expect(navbar(page).getByRole("link", { name: "Login" })).toBeVisible();
}

function storedSession(page) {
    return page.evaluate(function() { return JSON.parse(localStorage.getItem("t")); });
}

test.describe("authentication", function() {
    test("logging in from the navbar returns to the page the user was on", async function({ page, createUser }) {
        var user = await createUser();
        await page.goto("/#/hooks");
        await expect(page.getByRole("heading", { name: "Hooks" })).toBeVisible();

        await navbar(page).getByRole("link", { name: "Login" }).click();
        await expect(page).toHaveURL(/#\/login$/);
        await loginThroughForm(page, user);

        await expect(page).toHaveURL(/#\/hooks$/);
        await expectLoggedInAs(page, user.name);
    });

    test("logging in from a direct link to the login page lands on the schema list", async function({ page, createUser }) {
        var user = await createUser();
        await page.goto("/#/login");
        await loginThroughForm(page, user);

        await expect(page).toHaveURL(/#\/schemas$/);
        await expectLoggedInAs(page, user.name);
    });

    test("a wrong password shows an error and stays logged out", async function({ page, createUser, pageErrors }) {
        var user = await createUser();
        // the browser logs the rejected auth_token request
        pageErrors.allow(/status of 401/);
        await page.goto("/#/login");
        await loginThroughForm(page, { name: user.name, pw: "not-the-password" });

        await expect(page.getByText("Authentication failed. Please try again.")).toBeVisible();
        await expect(page).toHaveURL(/#\/login$/);
        expect(await storedSession(page)).toBeNull();
    });

    test("the session survives a page reload", async function({ page, createUser }) {
        var user = await createUser();
        await page.goto("/#/login");
        await loginThroughForm(page, user);
        await expectLoggedInAs(page, user.name);

        await page.reload();
        await expect(page.getByRole("heading", { name: "Schemas" })).toBeVisible();
        await expectLoggedInAs(page, user.name);
        expect((await storedSession(page)).username).toBe(user.name);
    });

    test("logging out ends the session on the server", async function({ page, createUser, sis }) {
        var user = await createUser();
        await page.goto("/#/login");
        await loginThroughForm(page, user);
        await expectLoggedInAs(page, user.name);
        var token = (await storedSession(page)).token;

        await logout(page, user.name);

        expect(await storedSession(page)).toBeNull();
        var stale = new SisClient(sis.apiUrl, token);
        await expect(stale.get("/users/" + user.name + "/tokens")).rejects.toMatchObject({ status: 401 });
    });

    test("an invalid stored session is cleared when the app loads", async function({ page, createUser, pageErrors }) {
        var user = await createUser();
        // the app checks the stored token with the API, which rejects it
        pageErrors.allow(/status of 401/);
        await page.addInitScript(function(name) {
            localStorage.setItem("t", JSON.stringify({
                username: name,
                expirationTime: Date.now() + 60000,
                token: "invalid.session.token"
            }));
        }, user.name);
        await page.goto("/#/schemas");

        await expect(navbar(page).getByRole("link", { name: "Login" })).toBeVisible();
        expect(await storedSession(page)).toBeNull();
    });

    test("a session token in the URL logs the user in", async function({ page, createUser, sis }) {
        var user = await createUser();
        var session = await SisClient.login(sis.apiUrl, user.name, user.pw);

        await page.goto("/#/schemas?username=" + user.name + "&token=" + session.name);

        await expectLoggedInAs(page, user.name);
        await expect(page).toHaveURL(/#\/schemas$/);
    });

    test("a persistent token in the URL logs the user in, and logging out keeps the token",
        async function({ page, createUser, api, sis }) {
            var user = await createUser();
            var token = await api.createToken(user.name, { desc: "embedding app" });

            await page.goto("/#/schemas?username=" + user.name + "&token=" + token.name);
            await expectLoggedInAs(page, user.name);
            await expect(page).toHaveURL(/#\/schemas$/);

            await logout(page, user.name);
            // the persistent token is a credential owned by another app; it must still work
            var client = new SisClient(sis.apiUrl, token.name);
            await expect(client.get("/users/" + user.name + "/tokens")).resolves.toBeTruthy();
        });

    test("the super user is shown in the user menu", async function({ page, signIn }) {
        await signIn(page);
        await page.goto("/#/schemas");
        await navbar(page).locator("a.dropdown-toggle", { hasText: env.ADMIN.name }).click();
        await expect(navbar(page).locator(".dropdown-menu").getByText("Super User", { exact: true })).toBeVisible();
    });
});

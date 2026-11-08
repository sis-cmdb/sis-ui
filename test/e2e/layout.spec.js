"use strict";

var fs = require("node:fs");
var path = require("node:path");
var { test, expect, env } = require("./fixtures");

var UI_VERSION = JSON.parse(fs.readFileSync(path.join(env.ROOT, "package.json"), "utf8")).version;

test.describe("layout", function() {
    test("unknown pages redirect to the schema list", async function({ page }) {
        await page.goto("/#/no/such/page");
        await expect(page).toHaveURL(/#\/schemas$/);
        await expect(page.getByRole("heading", { name: "Schemas" })).toBeVisible();
    });

    test("the footer shows the API and UI versions", async function({ page }) {
        await page.goto("/#/schemas");
        var footer = page.locator(".footer");
        await expect(footer).toContainText(new RegExp("API \\d+\\.\\d+\\.\\d+-\\S+"));
        await expect(footer).toContainText("UI " + UI_VERSION + "-local-build");
    });

    test("the theme menu switches the bootstrap theme", async function({ page }) {
        await page.goto("/#/schemas");
        var theme = page.locator("link[ng-href*=bootswatch]");
        await expect(theme).toHaveAttribute("href", /\/flatly\/bootstrap\.min\.css/);
        var navbarColor = function() {
            return page.locator("header.navbar").evaluate(function(el) { return el.ownerDocument.defaultView.getComputedStyle(el).backgroundColor; });
        };
        var flatly = await navbarColor();

        await page.locator("header").getByRole("link", { name: "Theme" }).click();
        await page.locator("header").getByRole("link", { name: "slate" }).click();

        await expect(theme).toHaveAttribute("href", /\/slate\/bootstrap\.min\.css/);
        await expect.poll(navbarColor).not.toBe(flatly);
    });

    test("the sidebar highlights the current section", async function({ page }) {
        await page.goto("/#/hooks");
        var sidebar = page.locator(".nav-toc");
        await expect(sidebar.locator("li.active")).toHaveText("Hooks");
        await sidebar.getByRole("link", { name: "Users" }).click();
        await expect(page).toHaveURL(/#\/users$/);
        await expect(sidebar.locator("li.active")).toHaveText("Users");
    });

    test("embed mode hides the header, footer and sidebar", async function({ page }) {
        await page.goto("/#/schemas?embed=true");
        await expect(page.getByRole("heading", { name: "Schemas" })).toBeVisible();
        await expect(page.locator("header.navbar")).toBeHidden();
        await expect(page.locator(".footer")).toBeHidden();
        await expect(page.locator(".nav-toc")).toBeHidden();
        await expect(page).toHaveURL(/#\/schemas$/);
    });
});

test.describe("docs", function() {
    test("the docs menu lists the API documentation pages", async function({ page }) {
        await page.goto("/#/schemas");
        await page.locator("header").getByRole("link", { name: "Docs" }).click();
        var items = page.locator("header .dropdown-menu").first().getByRole("link");
        await expect(items.first()).toHaveText("Index");
        await expect(items.filter({ hasText: "RBAC" })).toHaveCount(1);
        await expect(items.filter({ hasText: "Endpoints and Scripts" })).toHaveCount(1);

        await items.filter({ hasText: "Schemas" }).click();
        await expect(page).toHaveURL(/#\/docs\/schemas$/);
        await expect(page.locator("#_doc_left h1").first()).toBeVisible();
    });

    test("a docs page has a table of contents that scrolls to its sections", async function({ page }) {
        await page.goto("/#/docs/index");
        var toc = page.locator("#_doc_right ul.nav");
        await expect(toc).toBeVisible();
        await expect(page.locator("#table-of-contents")).toHaveCount(0);

        await toc.getByText("Bulk Operations", { exact: true }).click();
        await expect(page).toHaveURL(/#\/docs\/index#bulk-operations$/);
        await expect(page.locator("#bulk-operations")).toBeInViewport();
    });

    test("/docs opens the index page", async function({ page }) {
        await page.goto("/#/docs");
        await expect(page).toHaveURL(/#\/docs\/index$/);
        await expect(page.locator("#_doc_left")).toContainText("API Description");
    });
});

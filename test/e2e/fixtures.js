"use strict";

// Shared Playwright fixtures for the e2e suite.
//
//   api          SisClient authenticated as the seeded super user. Objects created
//                through it are deleted after the test.
//   uniqueName   uniqueName("host") -> "host_w0_k3x9a1", safe for parallel tests
//   createUser   creates a user with a password and returns { name, pw }
//   signIn       signIn(page, user?) starts the page logged in (default: super user)
//   pageErrors   every test fails on uncaught page errors and console errors;
//                call pageErrors.allow(/regex/) for errors a test expects

var fs = require("node:fs");
var base = require("@playwright/test");
var env = require("./support/env");
var { SisClient } = require("./support/sis-client");

function runtime() {
    return JSON.parse(fs.readFileSync(env.RUNTIME_FILE, "utf8"));
}

var test = base.test.extend({
    sis: [async function({}, use) {
        var rt = runtime();
        var session = await SisClient.login(rt.apiUrl, env.ADMIN.name, env.ADMIN.pw);
        await use({ apiUrl: rt.apiUrl, uiUrl: rt.uiUrl, adminToken: session.name });
    }, { scope: "worker" }],

    baseURL: async function({ sis }, use) {
        await use(sis.uiUrl);
    },

    api: async function({ sis }, use) {
        var client = new SisClient(sis.apiUrl, sis.adminToken);
        await use(client);
        await client.cleanup();
    },

    uniqueName: async function({}, use, testInfo) {
        var counter = 0;
        await use(function(prefix) {
            counter++;
            return [prefix, "w" + testInfo.workerIndex, counter + Math.random().toString(36).slice(2, 7)].join("_");
        });
    },

    createUser: async function({ api, uniqueName }, use) {
        await use(async function(opts) {
            opts = opts || {};
            var user = Object.assign({
                name: uniqueName("user"),
                pw: "pw_" + Math.random().toString(36).slice(2),
                roles: { e2e: "user" }
            }, opts);
            await api.createUser(user);
            return { name: user.name, pw: user.pw };
        });
    },

    signIn: async function({ sis }, use) {
        await use(async function(page, user) {
            user = user || env.ADMIN;
            var session = await SisClient.login(sis.apiUrl, user.name, user.pw);
            var details = await new SisClient(sis.apiUrl, session.name).get("/users/" + user.name);
            // Same shape SisUser keeps in localStorage after a UI login. Seeded once
            // per tab so tests can still observe the app clearing it.
            var stored = JSON.stringify({
                username: user.name,
                super_user: details.super_user,
                roles: details.roles,
                expirationTime: Date.now() + session.expires,
                token: session.name
            });
            await page.addInitScript(function(value) {
                if (!sessionStorage.getItem("__e2e_seeded")) {
                    localStorage.setItem("t", value);
                    sessionStorage.setItem("__e2e_seeded", "1");
                }
            }, stored);
            return session;
        });
    },

    pageErrors: [async function({ page }, use) {
        var errors = [];
        var allowed = [];
        page.on("pageerror", function(err) {
            errors.push("pageerror: " + err.message);
        });
        page.on("console", function(msg) {
            if (msg.type() === "error") {
                errors.push("console.error: " + msg.text() +
                            (msg.location().url ? " (" + msg.location().url + ")" : ""));
            }
        });
        await use({
            allow: function(re) { allowed.push(re); },
            list: function() { return errors.slice(); }
        });
        var unexpected = errors.filter(function(e) {
            return !allowed.some(function(re) { return re.test(e); });
        });
        base.expect(unexpected, "unexpected browser errors").toEqual([]);
    }, { auto: true }]
});

module.exports = { test: test, expect: base.expect, env: env };

"use strict";

// Brings up a real SIS stack for the e2e tests:
//   1. builds the UI (with the sis-api docs) into .e2e/dist, and the Vue
//      rewrite into .e2e/dist-vue
//   2. drops the e2e database and seeds a super user with sis-api's useradmin tool
//   3. starts sis-api and a static server for each UI on free ports; both get a
//      config.js in the AngularJS format, as existing deployments have
// Returns a teardown function that stops the servers.

var fs = require("node:fs");
var net = require("node:net");
var path = require("node:path");
var childProcess = require("node:child_process");
var { MongoClient } = require("mongodb");

var env = require("./env");
var builder = require("../../../scripts/build");
var serve = require("../../../scripts/serve");

function freePort() {
    return new Promise(function(resolve, reject) {
        var srv = net.createServer();
        srv.unref();
        srv.on("error", reject);
        srv.listen(0, "127.0.0.1", function() {
            var port = srv.address().port;
            srv.close(function() { resolve(port); });
        });
    });
}

async function waitForHttp(url, child, output, timeoutMs) {
    var deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error("sis-api exited with code " + child.exitCode + ":\n" + output.join(""));
        }
        try {
            var res = await fetch(url);
            if (res.ok) {
                return;
            }
        } catch {
            // not up yet
        }
        await new Promise(function(r) { setTimeout(r, 200); });
    }
    throw new Error("Timed out waiting for " + url + ":\n" + output.join(""));
}

function checkSisApi() {
    if (!fs.existsSync(path.join(env.SIS_API_DIR, "server.js"))) {
        throw new Error("sis-api not found at " + env.SIS_API_DIR +
                        ". Clone it there or set SIS_API_DIR.");
    }
    if (!fs.existsSync(path.join(env.SIS_API_DIR, "node_modules"))) {
        throw new Error("Run `npm install` in " + env.SIS_API_DIR + " first.");
    }
}

async function resetDatabase() {
    var client = new MongoClient(env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });
    try {
        await client.connect();
    } catch (err) {
        throw new Error("Cannot connect to MongoDB at " + env.MONGO_URL +
                        " (set SIS_E2E_MONGO_URL): " + err.message, { cause: err });
    }
    try {
        await client.db().dropDatabase();
    } finally {
        await client.close();
    }
}

function sisApiEnv(port) {
    return Object.assign({}, process.env, {
        db__url: env.MONGO_URL,
        server__port: String(port),
        server__address: "127.0.0.1",
        app__use_cluster: "false",
        app__scripts_enabled: "true",
        // signing keys committed to sis-api for its own tests
        app__jwt__keys_dir: path.join(env.SIS_API_DIR, "test/fixtures/keys"),
        logger__options__level: "warn"
    });
}

async function buildVue() {
    var vite = await import("vite");
    process.env.SIS_DOCPATH = path.join(env.SIS_API_DIR, "docs");
    await vite.build({
        configFile: path.join(env.ROOT, "vite.config.mts"),
        logLevel: "warn",
        build: { outDir: env.VUE_DIST }
    });
}

async function startServer(options) {
    var port = await freePort();
    var server = serve.createServer(options);
    await new Promise(function(resolve) { server.listen(port, "127.0.0.1", resolve); });
    return { server: server, url: "http://127.0.0.1:" + port };
}

function stopServer(server) {
    return new Promise(function(resolve) { server.close(resolve); server.closeAllConnections(); });
}

function seedAdmin(port) {
    var file = path.join(path.dirname(env.RUNTIME_FILE), "admin.json");
    fs.writeFileSync(file, JSON.stringify(env.ADMIN));
    childProcess.execFileSync(process.execPath, ["tools/useradmin.js", "update", file], {
        cwd: env.SIS_API_DIR,
        env: sisApiEnv(port),
        stdio: "pipe"
    });
}

module.exports = async function globalSetup() {
    checkSisApi();
    fs.mkdirSync(path.dirname(env.RUNTIME_FILE), { recursive: true });

    var buildPromise = Promise.all([
        builder.build({
            dist: env.DIST,
            docPath: path.join(env.SIS_API_DIR, "docs")
        }),
        buildVue()
    ]);
    await resetDatabase();

    var apiPort = await freePort();
    seedAdmin(apiPort);
    var output = [];
    var api = childProcess.spawn(process.execPath, ["server.js"], {
        cwd: env.SIS_API_DIR,
        env: sisApiEnv(apiPort),
        stdio: ["ignore", "pipe", "pipe"]
    });
    api.stdout.on("data", function(d) { output.push(d.toString()); });
    api.stderr.on("data", function(d) { output.push(d.toString()); });
    var apiUrl = "http://127.0.0.1:" + apiPort;

    try {
        await Promise.all([
            buildPromise,
            waitForHttp(apiUrl + "/api/v1.1/info", api, output, 30000)
        ]);
    } catch (err) {
        api.kill();
        throw err;
    }

    var ui = await startServer({ root: env.DIST, apiUrl: apiUrl });
    var vue = await startServer({ root: env.VUE_DIST, apiUrl: apiUrl, configPath: "/config.js" });

    fs.writeFileSync(env.RUNTIME_FILE, JSON.stringify({ apiUrl: apiUrl, uiUrl: ui.url, vueUrl: vue.url }));
    process.env.SIS_E2E_UI_URL = ui.url;

    return async function teardown() {
        await Promise.all([stopServer(ui.server), stopServer(vue.server)]);
        api.kill();
        await new Promise(function(resolve) {
            if (api.exitCode !== null) {
                return resolve();
            }
            api.on("exit", resolve);
        });
    };
};

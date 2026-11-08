"use strict";

// Loads the UI into a jsdom window the same way the build bundles it:
// vendor libraries, then the app sources (including the generated query parser
// and templates) in bundle order, plus angular-mocks.
//
//   var app = await loadApp();
//   var injector = app.injector(function($provide) { ... overrides ... });
//   var SisUtil = injector.get("SisUtil");

var fs = require("node:fs");
var path = require("node:path");
var vm = require("node:vm");
var { JSDOM } = require("jsdom");
var build = require("../../../scripts/build");
var serve = require("../../../scripts/serve");

var API_URL = "http://sis.test";
var sourcesPromise = null;

function sources() {
    if (!sourcesPromise) {
        sourcesPromise = build.appBundleParts().then(function(app) {
            var vendor = build.VENDOR_JS.map(function(file) {
                return { file: path.relative(build.ROOT, file), code: fs.readFileSync(file, "utf8") };
            });
            var mocks = path.join(build.ROOT, "node_modules/angular-mocks/angular-mocks.js");
            return vendor
                .concat([{ file: "node_modules/angular-mocks/angular-mocks.js", code: fs.readFileSync(mocks, "utf8") }])
                .concat([{ file: "config.js", code: serve.configJs(API_URL) }])
                .concat(app);
        });
    }
    return sourcesPromise;
}

async function loadApp() {
    var dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
        url: "http://ui.test/",
        runScripts: "outside-only",
        pretendToBeVisual: true
    });
    var context = dom.getInternalVMContext();
    (await sources()).forEach(function(src) {
        new vm.Script(src.code, { filename: src.file }).runInContext(context);
    });
    var window = dom.window;

    return {
        window: window,
        angular: window.angular,
        API_URL: API_URL,
        // A fresh injector for the sisui module with ngMock ($httpBackend,
        // $timeout.flush, rethrowing $exceptionHandler). Extra modules or
        // config functions (e.g. function($provide) {...}) are applied last.
        injector: function() {
            window.localStorage.clear();
            var modules = ["ng", "ngMock", "sisui"].concat(Array.prototype.slice.call(arguments));
            var injector = window.angular.injector(modules);
            // SisApi asks for the API and UI versions (footer) when created
            var $httpBackend = injector.get("$httpBackend");
            $httpBackend.whenGET(API_URL + "/api/v1.1/info").respond({ version: "test" });
            $httpBackend.whenGET("build.json").respond({ version: "test" });
            return injector;
        },
        close: function() {
            window.close();
        }
    };
}

// Base64url JWT with the given claims (signature is not checked by the UI).
function fakeJwt(claims) {
    var enc = function(o) { return Buffer.from(JSON.stringify(o)).toString("base64url"); };
    return enc({ alg: "EdDSA", typ: "JWT" }) + "." + enc(claims) + ".c2ln";
}

module.exports = { loadApp: loadApp, fakeJwt: fakeJwt };

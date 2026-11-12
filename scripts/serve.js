"use strict";

// Static server for dist/, used for development and by the e2e tests.
//
//   node scripts/serve.js [--watch] [--port 9000] [--host 127.0.0.1]
//                         [--api-url <url>] [--docpath <dir>]
//
// --watch    build first, rebuild when src/ changes, and live reload the browser
// --api-url  serve a generated app/js/config.js pointing at this SIS API, instead of
//            src/app/js/config.js
// --docpath  render the SIS API markdown docs (e.g. ../sis-api/docs) into the UI

var fs = require("node:fs");
var http = require("node:http");
var path = require("node:path");
var util = require("node:util");

var MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
    ".eot": "application/vnd.ms-fontobject",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
};

var LIVE_RELOAD_PATH = "/__livereload";
var LIVE_RELOAD_SCRIPT = "<script>new EventSource('" + LIVE_RELOAD_PATH +
    "').addEventListener('reload', function() { location.reload(); });</script>";

function configJs(apiUrl) {
    return "angular.module('sisconfig', [])\n    .constant(\"API_URL\", " +
        JSON.stringify(apiUrl) + ");\n";
}

// Returns an http.Server (not yet listening) with a reload() method.
// options: root, apiUrl, configPath (where apiUrl's config.js is served;
// default /app/js/config.js), liveReload
function createServer(options) {
    var root = path.resolve(options.root);
    var clients = new Set();

    var server = http.createServer(function(req, res) {
        var urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

        if (options.liveReload && urlPath === LIVE_RELOAD_PATH) {
            res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
            res.write(": connected\n\n");
            clients.add(res);
            req.on("close", function() { clients.delete(res); });
            return;
        }
        if (options.apiUrl !== undefined && urlPath === (options.configPath || "/app/js/config.js")) {
            res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-cache" });
            return res.end(configJs(options.apiUrl));
        }

        if (urlPath.endsWith("/")) {
            urlPath += "index.html";
        }
        var file = path.join(root, urlPath);
        if (file !== root && !file.startsWith(root + path.sep)) {
            res.writeHead(403);
            return res.end();
        }
        fs.readFile(file, function(err, data) {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                return res.end("Not found");
            }
            // docs pages are extensionless html fragments (app/docs/<name>)
            var type = MIME[path.extname(file)] ||
                (urlPath.startsWith("/app/docs/") ? MIME[".html"] : "application/octet-stream");
            if (options.liveReload && urlPath === "/index.html") {
                data = Buffer.from(data.toString("utf8").replace("</body>", LIVE_RELOAD_SCRIPT + "\n</body>"));
            }
            res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
            res.end(data);
        });
    });

    server.reload = function() {
        clients.forEach(function(res) { res.write("event: reload\ndata: \n\n"); });
    };
    server.on("close", function() {
        clients.forEach(function(res) { res.end(); });
    });
    return server;
}

module.exports = {
    createServer: createServer,
    configJs: configJs
};

function main() {
    var args = util.parseArgs({
        options: {
            watch: { type: "boolean" },
            port: { type: "string", default: "9000" },
            host: { type: "string", default: "127.0.0.1" },
            "api-url": { type: "string" },
            docpath: { type: "string" }
        }
    }).values;
    var builder = require("./build");
    var buildOpts = {
        docPath: args.docpath && path.resolve(args.docpath),
        withConfig: args["api-url"] === undefined
    };
    var server = createServer({
        root: path.join(builder.ROOT, "dist"),
        apiUrl: args["api-url"],
        liveReload: !!args.watch
    });

    var start = function() {
        server.listen(Number(args.port), args.host, function() {
            console.log("Serving dist on http://%s:%s/", args.host, args.port);
        });
    };

    if (!args.watch) {
        return start();
    }

    var building = null;
    var pending = false;
    var rebuild = function() {
        if (building) {
            pending = true;
            return building;
        }
        var started = Date.now();
        building = builder.build(buildOpts).then(function() {
            console.log("Built in %dms", Date.now() - started);
            server.reload();
        }, function(err) {
            console.error("Build failed: %s", err.message || err);
        }).then(function() {
            building = null;
            if (pending) {
                pending = false;
                return rebuild();
            }
        });
        return building;
    };

    builder.build(buildOpts).then(function() {
        start();
        var timer = null;
        var watchDirs = [builder.SRC].concat(buildOpts.docPath ? [buildOpts.docPath] : []);
        watchDirs.forEach(function(dir) {
            fs.watch(dir, { recursive: true }, function() {
                clearTimeout(timer);
                timer = setTimeout(rebuild, 100);
            });
        });
    }).catch(function(err) {
        console.error(err.message || err);
        process.exitCode = 1;
    });
}

if (require.main === module) {
    main();
}

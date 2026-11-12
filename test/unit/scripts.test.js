"use strict";

// scripts/build.js and scripts/serve.js

var assert = require("node:assert/strict");
var fs = require("node:fs");
var os = require("node:os");
var path = require("node:path");
var build = require("../../scripts/build");
var serve = require("../../scripts/serve");

function tmpdir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "sis-ui-test-"));
}

function write(dir, files) {
    Object.keys(files).forEach(function(rel) {
        fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), files[rel]);
    });
}

describe("build", function() {
    describe("findDocs", function() {
        it("lists markdown pages with index first and friendly titles", function() {
            var dir = tmpdir();
            write(dir, { "users.md": "", "index.md": "", "rbac.md": "", "scripts.md": "",
                         "sub/hooks.md": "", "notes.txt": "" });
            var docs = build.findDocs(dir).map(function(d) { return [d[0], d[2]]; });
            assert.deepEqual(docs, [
                ["index", "Index"], ["rbac", "RBAC"], ["scripts", "Endpoints and Scripts"],
                ["hooks", "Hooks"], ["users", "Users"]
            ]);
        });

        it("works without an index page", function() {
            var dir = tmpdir();
            write(dir, { "a.md": "" });
            assert.deepEqual(build.findDocs(dir).map(function(d) { return d[0]; }), ["a"]);
        });

        it("returns nothing without a docpath and rejects a missing one", function() {
            assert.deepEqual(build.findDocs(undefined), []);
            assert.throws(function() { build.findDocs("/no/such/dir"); }, /docpath must be a valid directory/);
        });
    });

    describe("renderMarkdown", function() {
        it("gives headings ids for the table of contents", function() {
            var html = build.renderMarkdown("# Bulk Operations\n\n## SIS.Fields & more");
            assert.match(html, /<h1 id="bulk-operations">Bulk Operations<\/h1>/);
            assert.match(html, /<h2 id="sis-fields-more">SIS.Fields &amp; more<\/h2>/);
        });

        it("points links to dotted headings at their ids", function() {
            var html = build.renderMarkdown("[SIS.Fields](#sisfields) [Other](#other) [x](./a.md)");
            assert.match(html, /href="#sis-fields"/);
            assert.match(html, /href="#other"/);
            assert.match(html, /href="\.\/a\.md"/);
        });

        it("highlights code in known languages and escapes the rest", function() {
            var js = build.renderMarkdown("```javascript\nvar a = 1;\n```");
            assert.match(js, /<pre><code class="lang-javascript"><span class="hljs-keyword">var<\/span>/);
            var other = build.renderMarkdown("```nosuchlang\n<b>\n```\n\n```\n<i>\n```");
            assert.match(other, /<code class="lang-nosuchlang">&lt;b&gt;/);
            assert.match(other, /<pre><code>&lt;i&gt;/);
        });

        it("keeps line breaks", function() {
            assert.match(build.renderMarkdown("a\nb"), /a<br>b/);
        });
    });

    it("compiles every partial into the template cache", async function() {
        var code = await build.generateTemplates();
        var cache = {};
        var angular = { module: function() { return { run: function(a) { a[1]({ put: function(k, v) { cache[k] = v; } }); } }; } };
        new Function("angular", code)(angular);
        var partials = fs.readdirSync(path.join(build.SRC, "app/partials")).filter(function(f) { return f.endsWith(".html"); });
        assert.deepEqual(Object.keys(cache).sort(), partials.map(function(f) { return "app/partials/" + f; }).sort());
        assert.doesNotMatch(cache["app/partials/footer.html"], /\n/);
    });

    it("generates a query parser factory", function() {
        var parser;
        var angular = { module: function() { return { factory: function(name, fn) { parser = fn(); } }; } };
        new Function("angular", build.generateParser())(angular);
        assert.deepEqual(parser.parse("a = 1"), ["a", "=", "1"]);
    });

    describe("build()", function() {
        var dist, docs, result;
        before(async function() {
            this.timeout(30000);
            dist = path.join(tmpdir(), "dist");
            docs = tmpdir();
            write(docs, { "index.md": "# Welcome\n", "rbac.md": "# Roles\n" });
            process.env.BUILD_NUMBER = "42";
            try {
                result = await build.build({ dist: dist, docPath: docs });
            } finally {
                delete process.env.BUILD_NUMBER;
            }
        });

        it("writes the app, vendor bundle, assets and source map", function() {
            ["app/js/sisui.min.js", "app/js/sisui.min.map", "app/js/vendor-libs.js", "app/js/vendor/ace/ace.js",
             "app/css/style.css", "common/images/logo.png", "common/css/jsondiffpatch/html.css",
             "common/css/bootswatch/flatly/bootstrap.min.css", "common/css/bootswatch/slate/bootstrap.min.css",
             "common/css/bootswatch/fonts/glyphicons-halflings-regular.woff"].forEach(function(f) {
                assert.ok(fs.existsSync(path.join(dist, f)), f);
            });
            assert.match(fs.readFileSync(path.join(dist, "app/js/sisui.min.js"), "utf8"), /sourceMappingURL=sisui\.min\.map/);
            var map = JSON.parse(fs.readFileSync(path.join(dist, "app/js/sisui.min.map"), "utf8"));
            assert.ok(map.sources.includes("src/app/js/app.js"));
            assert.ok(map.sourcesContent.length === map.sources.length);
        });

        it("does not ship config.js unless asked", function() {
            assert.equal(fs.existsSync(path.join(dist, "app/js/config.js")), false);
        });

        it("renders index.html with the scripts, themes and docs menu", function() {
            var html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
            assert.match(html, /<script src="\.\/app\/js\/vendor-libs\.js\?v=\d+"><\/script>/);
            assert.match(html, /<script src="\.\/app\/js\/config\.js\?v=\d+"><\/script>/);
            assert.match(html, /ng-href="\.\/common\/css\/bootswatch\/\{\{ bootstrap_theme \}\}\/bootstrap\.min\.css/);
            assert.match(html, /ng-init="setTheme\('flatly'\)"/);
            assert.match(html, /setTheme\('slate'\)/);
            assert.match(html, /ui-sref="docs\(\{doc:'rbac'\}\)">RBAC</);
            assert.equal(result.docs.length, 2);
        });

        it("renders each docs page inside the docs layout", function() {
            var page = fs.readFileSync(path.join(dist, "app/docs/index"), "utf8");
            assert.match(page, /<sis-documentation>/);
            assert.match(page, /<h1 id="welcome">Welcome<\/h1>/);
        });

        it("writes build info for the footer", function() {
            var info = JSON.parse(fs.readFileSync(path.join(dist, "build.json"), "utf8"));
            var pkg = JSON.parse(fs.readFileSync(path.join(build.ROOT, "package.json"), "utf8"));
            assert.equal(info.build_num, "42");
            assert.equal(info.version, pkg.version);
        });
    });
});

describe("serve", function() {
    var root, server, base;

    before(function(done) {
        root = tmpdir();
        write(root, {
            "index.html": "<html><body>app</body></html>",
            "app/js/config.js": "file config",
            "app/docs/rbac": "<h1>docs</h1>",
            "app/css/x.css": "a{}"
        });
        server = serve.createServer({ root: root, apiUrl: "http://api.test:3000", liveReload: true });
        server.listen(0, "127.0.0.1", function() {
            base = "http://127.0.0.1:" + server.address().port;
            done();
        });
    });

    after(function(done) {
        server.closeAllConnections();
        server.close(done);
    });

    it("serves files with their content type", async function() {
        var res = await fetch(base + "/app/css/x.css");
        assert.equal(res.status, 200);
        assert.match(res.headers.get("content-type"), /text\/css/);
    });

    it("serves extensionless docs pages as html", async function() {
        var res = await fetch(base + "/app/docs/rbac");
        assert.match(res.headers.get("content-type"), /text\/html/);
        assert.equal(await res.text(), "<h1>docs</h1>");
    });

    it("serves a generated config.js for --api-url", async function() {
        var body = await (await fetch(base + "/app/js/config.js")).text();
        assert.equal(body, serve.configJs("http://api.test:3000"));
        assert.match(body, /constant\("API_URL", "http:\/\/api\.test:3000"\)/);
    });

    it("returns 404 for missing files and refuses paths outside the root", async function() {
        assert.equal((await fetch(base + "/nope.js")).status, 404);
        // "/.." segments are resolved by URL parsing; encoded slashes are not
        assert.equal((await fetch(base + "/..%2f..%2f..%2fetc%2fpasswd")).status, 403);
    });

    it("injects live reload into index.html and pushes reload events", async function() {
        var html = await (await fetch(base + "/")).text();
        assert.match(html, /new EventSource\('\/__livereload'\)/);

        var res = await fetch(base + "/__livereload");
        var reader = res.body.getReader();
        await reader.read(); // connected comment
        server.reload();
        var chunk = new TextDecoder().decode((await reader.read()).value);
        assert.match(chunk, /event: reload/);
        await reader.cancel();
    });
});

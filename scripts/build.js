"use strict";

// Builds the UI into dist/. Replaces the former Grunt + Bower pipeline.
//
//   node scripts/build.js [--docpath <dir>] [--with-config]
//
// --docpath     render the SIS API markdown docs (e.g. ../sis-api/docs) into the UI
// --with-config copy src/app/js/config.js into dist (deployments normally supply their own)
//
// The file lists exported here are also used by the dev server and the unit tests,
// so the bundle order is defined in exactly one place.

var fs = require("node:fs");
var path = require("node:path");
var util = require("node:util");

var ROOT = path.resolve(__dirname, "..");
var SRC = path.join(ROOT, "src");
var NODE_MODULES = path.join(ROOT, "node_modules");
var DEFAULT_DIST = path.join(ROOT, "dist");

// Bootswatch themes offered in the Theme menu. The first one is the default.
var THEMES = ["flatly", "darkly", "slate"];

function nm(rel) {
    return path.join(NODE_MODULES, rel);
}

// Third party libraries concatenated into vendor-libs.js. Order matters.
var VENDOR_JS = [
    nm("jquery/dist/jquery.min.js"),
    nm("angular/angular.js"),
    nm("angular-ui-router/release/angular-ui-router.js"),
    // not published to npm at this version, so it is vendored
    path.join(ROOT, "vendor/angular-ui-bootstrap/ui-bootstrap-tpls-0.11.2.js"),
    nm("moment/min/moment.min.js"),
    nm("jsondiffpatch/public/build/jsondiffpatch-full.min.js"),
    nm("jsondiffpatch/public/build/jsondiffpatch-formatters.min.js"),
    // ipv6 - https://github.com/beaugunderson/javascript-ipv6
    nm("ipv6/lib/browser/jsbn-combined.js"),
    nm("ipv6/lib/browser/sprintf.js"),
    nm("ipv6/ipv6.js"),
    nm("sis/lib/sis-client.js"),
    nm("angular-smart-table/dist/smart-table.min.js")
];

function sortedJsFiles(dir) {
    return fs.readdirSync(dir)
        .filter(function(f) { return f.endsWith(".js"); })
        .sort()
        .map(function(f) { return path.join(dir, f); });
}

// The app bundle, in order. Generated sources are represented by markers.
var PARSER = "<generated:query-parser>";
var TEMPLATES = "<generated:templates>";
function appSources() {
    var js = path.join(SRC, "app/js");
    return [path.join(js, "app.js")]
        .concat(sortedJsFiles(path.join(js, "components")))
        .concat([PARSER, TEMPLATES])
        .concat(sortedJsFiles(path.join(js, "controllers")));
}

// src/pegjs/query.pegjs -> the SisQueryParser angular factory
function generateParser() {
    var peggy = require("peggy");
    var grammar = fs.readFileSync(path.join(SRC, "pegjs/query.pegjs"), "utf8");
    var parser = peggy.generate(grammar, { output: "source", format: "bare" });
    // parenthesized so the generated header comment can't end the return statement
    return "angular.module('sisui').factory('SisQueryParser',function(){ return (\n" +
        parser + "\n);});\n";
}

// src/app/partials/*.html -> $templateCache entries keyed by "app/partials/<name>"
async function generateTemplates() {
    var minify = require("html-minifier-terser").minify;
    var dir = path.join(SRC, "app/partials");
    var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith(".html"); }).sort();
    var out = ["angular.module('sisui').run(['$templateCache', function($templateCache) {",
               "  'use strict';", ""];
    for (var i = 0; i < files.length; ++i) {
        var html = await minify(fs.readFileSync(path.join(dir, files[i]), "utf8"), {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            // keep one space wherever the source has whitespace, so the result
            // renders like the source (e.g. gaps between inline-block buttons)
            conservativeCollapse: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        });
        out.push("  $templateCache.put(" + JSON.stringify("app/partials/" + files[i]) + ",",
                 "    " + JSON.stringify(html), "  );", "");
    }
    out.push("}]);", "");
    return out.join("\n");
}

// Returns [{ file: <relative name for source maps>, code }] for the app bundle.
async function appBundleParts() {
    var parts = [];
    var sources = appSources();
    for (var i = 0; i < sources.length; ++i) {
        var s = sources[i];
        if (s === PARSER) {
            parts.push({ file: "generated/query-parser.js", code: generateParser() });
        } else if (s === TEMPLATES) {
            parts.push({ file: "generated/templates.js", code: await generateTemplates() });
        } else {
            parts.push({ file: path.relative(ROOT, s), code: fs.readFileSync(s, "utf8") });
        }
    }
    return parts;
}

// Docs: every *.md under docPath becomes a page. index.md is the home page and
// is listed first. Returns [[name, absPath, title]].
function findDocs(docPath) {
    if (!docPath) {
        return [];
    }
    if (!fs.existsSync(docPath) || !fs.statSync(docPath).isDirectory()) {
        throw new Error("docpath must be a valid directory: " + docPath);
    }
    var docs = [];
    var home = null;
    fs.readdirSync(docPath, { recursive: true }).sort().forEach(function(rel) {
        if (!rel.endsWith(".md")) {
            return;
        }
        var abs = path.join(docPath, rel);
        var name = path.basename(rel, ".md");
        var title = name[0].toUpperCase() + name.substring(1);
        if (name === "rbac") {
            title = "RBAC";
        } else if (name === "scripts") {
            title = "Endpoints and Scripts";
        }
        if (name === "index") {
            home = [name, abs, title];
        } else {
            docs.push([name, abs, title]);
        }
    });
    if (home) {
        docs.unshift(home);
    }
    return docs;
}

function renderMarkdown(markdown) {
    var Marked = require("marked").Marked;
    var hljs = require("highlight.js");
    var escapeHtml = function(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    };
    var marked = new Marked({
        breaks: true,
        renderer: {
            // heading ids drive the docs table of contents
            heading: function(token) {
                var id = token.text.toLowerCase().replace(/[^\w]+/g, "-");
                return "<h" + token.depth + " id=\"" + id + "\">" +
                    this.parser.parseInline(token.tokens) + "</h" + token.depth + ">\n";
            },
            // links to headings that contain dots (e.g. "SIS.Foo") use the heading id form
            link: function(token) {
                if (token.href[0] === "#" && token.text.indexOf(".") !== -1) {
                    token.href = "#" + token.text.replace(/[^\w:]/g, "-").toLowerCase();
                }
                // fall back to the default link renderer with the updated token
                return false;
            },
            code: function(token) {
                var lang = (token.lang || "").split(/\s/)[0];
                var body = lang && hljs.getLanguage(lang) ?
                    hljs.highlight(token.text, { language: lang, ignoreIllegals: true }).value :
                    escapeHtml(token.text);
                var cls = lang ? " class=\"lang-" + escapeHtml(lang) + "\"" : "";
                return "<pre><code" + cls + ">" + body + "\n</code></pre>\n";
            }
        }
    });
    return marked.parse(markdown);
}

function renderTemplate(file, context) {
    var nunjucks = require("nunjucks");
    var env = new nunjucks.Environment(null, { autoescape: false });
    return env.renderString(fs.readFileSync(file, "utf8"), context);
}

function copyTree(from, to, filter) {
    fs.cpSync(from, to, {
        recursive: true,
        filter: function(src) {
            return fs.statSync(src).isDirectory() || !filter || filter(src);
        }
    });
}

async function build(options) {
    options = options || {};
    var terser = require("terser");
    var dist = options.dist || DEFAULT_DIST;
    var docs = findDocs(options.docPath);
    var pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    var version = Math.round(Date.now() / 1000);

    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(path.join(dist, "app/js"), { recursive: true });

    // app bundle
    var parts = await appBundleParts();
    var input = {};
    parts.forEach(function(p) { input[p.file] = p.code; });
    var min = await terser.minify(input, {
        mangle: false,
        sourceMap: { filename: "sisui.min.js", url: "sisui.min.map", includeSources: true }
    });
    fs.writeFileSync(path.join(dist, "app/js/sisui.min.js"), min.code);
    fs.writeFileSync(path.join(dist, "app/js/sisui.min.map"), min.map);

    // vendor bundle
    fs.writeFileSync(path.join(dist, "app/js/vendor-libs.js"), VENDOR_JS.map(function(f) {
        return fs.readFileSync(f, "utf8");
    }).join(";\n"));
    copyTree(nm("ace-builds/src-min-noconflict"), path.join(dist, "app/js/vendor/ace"), function(f) {
        return f.endsWith(".js");
    });

    // static assets
    var isCss = function(f) { return f.endsWith(".css"); };
    copyTree(path.join(SRC, "app/css"), path.join(dist, "app/css"), isCss);
    copyTree(path.join(SRC, "docs/css"), path.join(dist, "docs/css"), isCss);
    copyTree(path.join(SRC, "common/images"), path.join(dist, "common/images"));
    THEMES.concat(["fonts"]).forEach(function(dir) {
        copyTree(nm("bootswatch/" + dir), path.join(dist, "common/css/bootswatch", dir), function(f) {
            return isCss(f) || path.basename(f).startsWith("glyphicons");
        });
    });
    copyTree(nm("jsondiffpatch/public/formatters-styles"), path.join(dist, "common/css/jsondiffpatch"), isCss);

    if (options.withConfig) {
        var config = path.join(SRC, "app/js/config.js");
        if (!fs.existsSync(config)) {
            throw new Error("src/app/js/config.js does not exist. Copy config.js.sample to create it.");
        }
        fs.copyFileSync(config, path.join(dist, "app/js/config.js"));
    }

    // build info (read by the footer)
    fs.writeFileSync(path.join(dist, "build.json"), JSON.stringify({
        build_num: process.env.BUILD_NUMBER || "local-build",
        git_hash: process.env.GIT_COMMIT_HASH || "dev-hash",
        build_id: process.env.BUILD_ID || new Date().toISOString().replace(/:/g, "-").replace(/\..*/, ""),
        version: pkg.version
    }));

    // pages
    fs.writeFileSync(path.join(dist, "index.html"), renderTemplate(path.join(SRC, "index.njk"), {
        scripts: ["./app/js/vendor-libs.js", "./app/js/config.js", "./app/js/sisui.min.js"],
        theme: "./common/css/bootswatch/{{ bootstrap_theme }}/bootstrap.min.css",
        themes: THEMES,
        css: ["./common/css/jsondiffpatch/html.css",
              "./common/css/jsondiffpatch/annotated.css",
              "./app/css/style.css"],
        version: version,
        docs: docs
    }));
    if (docs.length) {
        fs.mkdirSync(path.join(dist, "app/docs"), { recursive: true });
        docs.forEach(function(doc) {
            var content = renderMarkdown(fs.readFileSync(doc[1], "utf8"));
            fs.writeFileSync(path.join(dist, "app/docs", doc[0]),
                             renderTemplate(path.join(SRC, "docs/docs.njk"), { content: content }));
        });
    }
    return { dist: dist, docs: docs };
}

module.exports = {
    ROOT: ROOT,
    SRC: SRC,
    VENDOR_JS: VENDOR_JS,
    THEMES: THEMES,
    appSources: appSources,
    appBundleParts: appBundleParts,
    generateParser: generateParser,
    generateTemplates: generateTemplates,
    findDocs: findDocs,
    renderMarkdown: renderMarkdown,
    build: build
};

if (require.main === module) {
    var args = util.parseArgs({
        options: {
            docpath: { type: "string" },
            "with-config": { type: "boolean" }
        }
    }).values;
    var started = Date.now();
    build({
        docPath: args.docpath && path.resolve(args.docpath),
        withConfig: args["with-config"]
    }).then(function(result) {
        console.log("Built %s in %dms%s", path.relative(process.cwd(), result.dist) || ".",
                    Date.now() - started,
                    result.docs.length ? " (" + result.docs.length + " docs pages)" : "");
    }).catch(function(err) {
        console.error(err.message || err);
        process.exitCode = 1;
    });
}

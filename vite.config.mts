// Vite config of the UI. Usually run through the npm scripts (see README.md):
//
//   npm run serve   dev server (scripts/serve.mjs)
//   npm run build   type check and build into dist/ (scripts/build.mjs)
//   npm test        unit tests (src/**/*.test.ts, scripts/**/*.test.mts)
//
// Environment: SIS_API_URL makes the dev and preview servers answer
// app/js/config.js with that API; SIS_DOCPATH (e.g. ../sis-api/docs) renders
// the SIS API docs into the UI.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import peggy from "peggy";
import vue from "@vitejs/plugin-vue";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { findDocs, renderMarkdown } from "./scripts/docs.mts";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as { version: string };

// Bootswatch themes offered in the Theme menu. The first one is the default.
const THEMES = ["flatly", "darkly", "slate"];

// the path of a request ("//x" is a path here, not a protocol relative url)
function requestPath(url: string | undefined): string {
    const path = (url || "/").split(/[?#]/)[0]!;
    try {
        return decodeURIComponent(path);
    } catch {
        // malformed escapes match nothing of ours
        return path;
    }
}

// build info, shown in the footer and written to dist/build.json
const BUILD_INFO = {
    build_num: process.env.BUILD_NUMBER || "local-build",
    git_hash: process.env.GIT_COMMIT_HASH || "dev-hash",
    build_id: process.env.BUILD_ID || new Date().toISOString().replace(/:/g, "-").replace(/\..*/, ""),
    version: PACKAGE.version
};

// Compiles imported .pegjs grammars into ES modules exporting parse() and
// SyntaxError.
function peggyGrammars(): Plugin {
    return {
        name: "sis-peggy",
        transform(code, id) {
            if (!id.endsWith(".pegjs")) {
                return null;
            }
            return {
                code: peggy.generate(code, { output: "source", format: "es", grammarSource: id }),
                map: null
            };
        }
    };
}

// app/js/config.js is not part of the build: deployments supply their own (see
// public/app/js/config-compat.js). The dev and preview servers answer it with
// SIS_API_URL, or with config.js in the project (gitignored), if there is one.
function devConfig(): Plugin {
    const middleware: Connect.NextHandleFunction = function(req, res, next) {
        if (requestPath(req.url) !== "/app/js/config.js") {
            return next();
        }
        const local = path.join(ROOT, "config.js");
        res.setHeader("Content-Type", "text/javascript");
        res.setHeader("Cache-Control", "no-cache");
        if (process.env.SIS_API_URL) {
            res.end("window.SIS_CONFIG = " + JSON.stringify({ API_URL: process.env.SIS_API_URL }) + ";\n");
        } else if (fs.existsSync(local)) {
            res.end(fs.readFileSync(local));
        } else {
            next();
        }
    };
    return {
        name: "sis-dev-config",
        configureServer: (server) => void server.middlewares.use(middleware),
        configurePreviewServer: (server) => void server.middlewares.use(middleware)
    };
}

// Files served as they are, at the paths the AngularJS UI used: the Bootswatch
// themes (switched at runtime by the Theme menu) with their fonts, and the Ace
// editor (loaded when the code editor opens; it loads its modes from its own
// directory). Images and the config shim are in public/.
const STATIC_DIRS: Array<{ url: string; dir: string; include: (file: string) => boolean }> = [
    ...THEMES.map((theme) => ({
        url: "common/css/bootswatch/" + theme,
        dir: path.join(ROOT, "node_modules/bootswatch", theme),
        include: (file: string) => file.endsWith(".css")
    })),
    {
        url: "common/css/bootswatch/fonts",
        dir: path.join(ROOT, "node_modules/bootswatch/fonts"),
        include: (file: string) => file.startsWith("glyphicons")
    },
    {
        url: "app/js/vendor/ace",
        dir: path.join(ROOT, "node_modules/ace-builds/src-min-noconflict"),
        include: (file: string) => file.endsWith(".js")
    }
];

const MIME: Record<string, string> = {
    ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
    ".eot": "application/vnd.ms-fontobject", ".ttf": "font/ttf", ".woff": "font/woff"
};

function staticFiles(): Plugin {
    return {
        name: "sis-static",
        configureServer(server) {
            server.middlewares.use(function(req, res, next) {
                const urlPath = requestPath(req.url).slice(1);
                const file = path.basename(urlPath);
                const entry = STATIC_DIRS.find((e) => path.dirname(urlPath) === e.url && e.include(file));
                if (entry && fs.existsSync(path.join(entry.dir, file))) {
                    res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
                    fs.createReadStream(path.join(entry.dir, file)).pipe(res);
                    return;
                }
                next();
            });
        },
        writeBundle(options) {
            for (const entry of STATIC_DIRS) {
                const target = path.join(options.dir!, entry.url);
                fs.mkdirSync(target, { recursive: true });
                for (const file of fs.readdirSync(entry.dir).filter(entry.include)) {
                    fs.copyFileSync(path.join(entry.dir, file), path.join(target, file));
                }
            }
            fs.writeFileSync(path.join(options.dir!, "build.json"), JSON.stringify(BUILD_INFO));
        }
    };
}

// The SIS API docs (markdown from SIS_DOCPATH), rendered at build time.
// "virtual:sis-docs" lists them and loads each page's html as its own chunk.
function apiDocs(): Plugin {
    const LIST = "virtual:sis-docs";
    const PAGE = "virtual:sis-docs/page/";
    const docs = () => findDocs(process.env.SIS_DOCPATH);
    return {
        name: "sis-docs",
        resolveId(id) {
            return id === LIST || id.startsWith(PAGE) ? "\0" + id : null;
        },
        load(id) {
            if (id === "\0" + LIST) {
                const list = docs();
                const loaders = list.map(({ name }) => JSON.stringify(name) + ": () => import(" + JSON.stringify(PAGE + name) + ")");
                return "export const docs = " + JSON.stringify(list.map(({ name, title }) => ({ name, title }))) + ";\n" +
                    "const pages = {" + loaders.join(", ") + "};\n" +
                    "export function loadDoc(name) {\n" +
                    "    return Object.hasOwn(pages, name) ? pages[name]().then((m) => m.default) : Promise.resolve(null);\n" +
                    "}\n";
            }
            if (id.startsWith("\0" + PAGE)) {
                const doc = docs().find(({ name }) => name === id.slice(PAGE.length + 1));
                if (!doc) {
                    return "export default null;";
                }
                this.addWatchFile(doc.file);
                return "export default " + JSON.stringify(renderMarkdown(fs.readFileSync(doc.file, "utf8"))) + ";";
            }
            return null;
        }
    };
}

export default defineConfig({
    // relative asset urls: the UI is often served from a sub path
    base: "./",
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    // keep the whitespace between elements, as the AngularJS
                    // templates did: the gaps between inline-block buttons depend on it
                    whitespace: "preserve"
                }
            }
        }),
        peggyGrammars(),
        devConfig(),
        staticFiles(),
        apiDocs()
    ],
    resolve: {
        alias: {
            "@": path.join(ROOT, "src")
        }
    },
    define: {
        __UI_BUILD__: JSON.stringify(BUILD_INFO),
        __THEMES__: JSON.stringify(THEMES)
    },
    server: {
        host: "127.0.0.1",
        port: 9000
    },
    preview: {
        host: "127.0.0.1",
        port: 9000
    },
    build: {
        outDir: path.join(ROOT, "dist"),
        emptyOutDir: true,
        sourcemap: true
    },
    test: {
        include: ["src/**/*.test.ts", "scripts/**/*.test.mts"],
        environment: "node",
        // the moment output in src/lib/format.moment.json is for this zone
        env: { TZ: "America/New_York" }
    }
});

// Vite config for the Vue rewrite of the UI (vue/). The AngularJS app in src/
// keeps its own build (scripts/build.js) until the rewrite replaces it.
//
//   npm run dev:vue     dev server; SIS_API_URL=http://localhost:3000 sets the
//                       API, SIS_DOCPATH=../sis-api/docs adds the API docs
//   npm run build:vue   type check and build into dist-vue/
//   npm run test:vue    unit tests (vue/src/**/*.test.ts)

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import peggy from "peggy";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vitest/config";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// the AngularJS build: its theme list and docs rendering are shared
const legacyBuild = require("./scripts/build.js") as {
    THEMES: string[];
    findDocs(docPath: string | undefined): Array<[string, string, string]>;
    renderMarkdown(markdown: string): string;
};

// Compiles imported .pegjs grammars into ES modules exporting parse() and
// SyntaxError, so the grammar has one source shared with the AngularJS build.
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

// config.js is not bundled, so deployments can swap it (see vue/public/). In
// development, SIS_API_URL generates it.
function devConfig(): Plugin {
    return {
        name: "sis-dev-config",
        apply: "serve",
        configureServer(server) {
            const apiUrl = process.env.SIS_API_URL;
            if (!apiUrl) {
                return;
            }
            server.middlewares.use("/config.js", function(_req, res) {
                res.setHeader("Content-Type", "text/javascript");
                res.end("window.SIS_CONFIG = " + JSON.stringify({ API_URL: apiUrl }) + ";\n");
            });
        }
    };
}

// Files served as they are, at the same paths as in the AngularJS build: the
// Bootswatch themes (switched at runtime by the Theme menu) with their fonts,
// and the images.
const STATIC_DIRS: Array<{ url: string; dir: string; include: (file: string) => boolean }> = [
    ...legacyBuild.THEMES.map((theme) => ({
        url: "common/css/bootswatch/" + theme,
        dir: path.join(ROOT, "node_modules/bootswatch", theme),
        include: (file: string) => file.endsWith(".css")
    })),
    {
        url: "common/css/bootswatch/fonts",
        dir: path.join(ROOT, "node_modules/bootswatch/fonts"),
        include: (file: string) => file.startsWith("glyphicons")
    },
    { url: "common/images", dir: path.join(ROOT, "src/common/images"), include: () => true }
];

const MIME: Record<string, string> = {
    ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml",
    ".eot": "application/vnd.ms-fontobject", ".ttf": "font/ttf", ".woff": "font/woff"
};

function staticFiles(): Plugin {
    return {
        name: "sis-static",
        configureServer(server) {
            server.middlewares.use(function(req, res, next) {
                const urlPath = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname).slice(1);
                for (const entry of STATIC_DIRS) {
                    const file = path.basename(urlPath);
                    if (path.dirname(urlPath) === entry.url && entry.include(file) && fs.existsSync(path.join(entry.dir, file))) {
                        res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
                        fs.createReadStream(path.join(entry.dir, file)).pipe(res);
                        return;
                    }
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
        }
    };
}

// The SIS API docs (markdown in sis-api/docs, from SIS_DOCPATH), rendered at
// build time. "virtual:sis-docs" lists them and loads each page's html as its
// own chunk.
function apiDocs(): Plugin {
    const LIST = "virtual:sis-docs";
    const PAGE = "virtual:sis-docs/page/";
    const docs = () => legacyBuild.findDocs(process.env.SIS_DOCPATH);
    return {
        name: "sis-docs",
        resolveId(id) {
            return id === LIST || id.startsWith(PAGE) ? "\0" + id : null;
        },
        load(id) {
            if (id === "\0" + LIST) {
                const list = docs();
                const loaders = list.map(([name]) => JSON.stringify(name) + ": () => import(" + JSON.stringify(PAGE + name) + ")");
                return "export const docs = " + JSON.stringify(list.map(([name, , title]) => ({ name, title }))) + ";\n" +
                    "const pages = {" + loaders.join(", ") + "};\n" +
                    "export function loadDoc(name) {\n" +
                    "    return Object.hasOwn(pages, name) ? pages[name]().then((m) => m.default) : Promise.resolve(null);\n" +
                    "}\n";
            }
            if (id.startsWith("\0" + PAGE)) {
                const doc = docs().find(([name]) => name === id.slice(PAGE.length + 1));
                if (!doc) {
                    return "export default null;";
                }
                this.addWatchFile(doc[1]);
                return "export default " + JSON.stringify(legacyBuild.renderMarkdown(fs.readFileSync(doc[1], "utf8"))) + ";";
            }
            return null;
        }
    };
}

export default defineConfig({
    root: path.join(ROOT, "vue"),
    // relative asset urls: the UI is often served from a sub path
    base: "./",
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    // keep the whitespace between elements, as the AngularJS
                    // templates do: the gaps between inline-block buttons depend on it
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
            "@": path.join(ROOT, "vue/src"),
            // shared with the AngularJS build until the rewrite replaces it
            "@grammar": path.join(ROOT, "src/pegjs"),
            "@legacy-css": path.join(ROOT, "src/app/css")
        }
    },
    define: {
        // shown in the footer; the same fields as the AngularJS build's build.json
        __UI_BUILD__: JSON.stringify({
            version: JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version,
            build_num: process.env.BUILD_NUMBER || "local-build",
            git_hash: process.env.GIT_COMMIT_HASH || "dev-hash"
        }),
        __THEMES__: JSON.stringify(legacyBuild.THEMES)
    },
    server: {
        host: "127.0.0.1",
        port: 9001,
        fs: { allow: [ROOT] }
    },
    build: {
        outDir: path.join(ROOT, "dist-vue"),
        emptyOutDir: true,
        sourcemap: true
    },
    test: {
        root: ROOT,
        include: ["vue/src/**/*.test.ts"],
        environment: "node"
    }
});

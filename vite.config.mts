// Vite config for the Vue rewrite of the UI (vue/). The AngularJS app in src/
// keeps its own build (scripts/build.js) until the rewrite replaces it.
//
//   npm run dev:vue     dev server; SIS_API_URL=http://localhost:3000 sets the API
//   npm run build:vue   type check and build into dist-vue/
//   npm run test:vue    unit tests (vue/src/**/*.test.ts)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import peggy from "peggy";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vitest/config";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

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

export default defineConfig({
    root: path.join(ROOT, "vue"),
    // relative asset urls: the UI is often served from a sub path
    base: "./",
    plugins: [vue(), peggyGrammars(), devConfig()],
    resolve: {
        alias: {
            "@": path.join(ROOT, "vue/src"),
            // shared with the AngularJS build until the rewrite replaces it
            "@grammar": path.join(ROOT, "src/pegjs")
        }
    },
    define: {
        // shown in the footer; the same fields as the AngularJS build's build.json
        __UI_BUILD__: JSON.stringify({
            version: JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version,
            build_num: process.env.BUILD_NUMBER || "local-build",
            git_hash: process.env.GIT_COMMIT_HASH || "dev-hash"
        })
    },
    server: {
        host: "127.0.0.1",
        port: 9001
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

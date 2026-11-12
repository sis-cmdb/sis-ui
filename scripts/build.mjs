// Builds the UI into dist/ (npm run build; type checking runs before it).
//
//   node scripts/build.mjs [--docpath <dir>] [--with-config] [--out <dir>]
//
// --docpath     render the SIS API markdown docs (e.g. ../sis-api/docs) into the UI
// --with-config copy config.js from the project into the build as app/js/config.js
//               (deployments normally supply their own)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { build } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function buildUi({ docPath, withConfig = false, outDir = path.join(ROOT, "dist"), logLevel = "info" } = {}) {
    if (docPath) {
        process.env.SIS_DOCPATH = path.resolve(docPath);
    }
    await build({ configFile: path.join(ROOT, "vite.config.mts"), logLevel, build: { outDir } });
    if (withConfig) {
        const config = path.join(ROOT, "config.js");
        if (!fs.existsSync(config)) {
            throw new Error("config.js does not exist. Copy config.js.sample to create it.");
        }
        fs.copyFileSync(config, path.join(outDir, "app/js/config.js"));
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { values } = parseArgs({
        options: {
            docpath: { type: "string" },
            "with-config": { type: "boolean" },
            out: { type: "string" }
        }
    });
    try {
        await buildUi({ docPath: values.docpath, withConfig: values["with-config"], outDir: values.out && path.resolve(values.out) });
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    }
}

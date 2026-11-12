// Development server with hot reload (npm run serve).
//
//   node scripts/serve.mjs [--api-url <url>] [--docpath <dir>] [--port 9000] [--host 127.0.0.1]
//
// --api-url  answer app/js/config.js with this SIS API, instead of config.js
//            in the project
// --docpath  render the SIS API markdown docs (e.g. ../sis-api/docs) into the UI

import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createServer } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { values } = parseArgs({
    options: {
        "api-url": { type: "string" },
        docpath: { type: "string" },
        port: { type: "string" },
        host: { type: "string" }
    }
});
if (values["api-url"]) {
    process.env.SIS_API_URL = values["api-url"];
}
if (values.docpath) {
    process.env.SIS_DOCPATH = path.resolve(values.docpath);
}
const server = await createServer({
    configFile: path.join(ROOT, "vite.config.mts"),
    server: {
        ...(values.port ? { port: Number(values.port) } : {}),
        ...(values.host ? { host: values.host } : {})
    }
});
await server.listen();
server.printUrls();

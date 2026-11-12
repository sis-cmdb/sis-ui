"use strict";

// Settings for the e2e environment. Override with environment variables.

var path = require("node:path");

var ROOT = path.resolve(__dirname, "../../..");

module.exports = {
    ROOT: ROOT,
    // a checkout of https://github.com/sis-cmdb/sis-api with `npm install` done
    SIS_API_DIR: path.resolve(process.env.SIS_API_DIR || path.join(ROOT, "../sis-api")),
    // the database is dropped at the start of every run
    MONGO_URL: process.env.SIS_E2E_MONGO_URL || "mongodb://localhost:27017/sis-ui-e2e",
    // where the UI under test is built
    DIST: path.join(ROOT, ".e2e/dist"),
    // the super user seeded into the fresh database
    ADMIN: { name: "e2e_admin", pw: "e2e_admin_pw", email: "e2e_admin@example.com", super_user: true },
    // written by global setup, read by the tests
    RUNTIME_FILE: path.join(ROOT, ".e2e/runtime.json")
};

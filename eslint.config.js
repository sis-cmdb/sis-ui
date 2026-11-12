"use strict";

var js = require("@eslint/js");
var globals = require("globals");

module.exports = [
    {
        ignores: ["node_modules/**", "dist/**", ".e2e/**", "vendor/**", "test-results/**", "playwright-report/**"]
    },
    js.configs.recommended,
    {
        // the app: plain browser scripts concatenated into one bundle
        files: ["src/**/*.js"],
        languageOptions: {
            ecmaVersion: 5,
            sourceType: "script",
            globals: Object.assign({}, globals.browser, {
                angular: "readonly",
                SIS: "readonly",
                $: "readonly",
                jQuery: "readonly",
                ace: "readonly",
                moment: "readonly",
                jsondiffpatch: "readonly",
                // from the ipv6 library
                v4: "readonly",
                v6: "readonly"
            })
        },
        rules: {
            // unused callback arguments (function(err, res) {...}) are idiomatic here
            "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
            // var x = null; before assignment in branches is the ES5 style used throughout
            "no-useless-assignment": "off"
        }
    },
    {
        // build scripts, configs and tests run in node
        files: ["*.js", "scripts/**/*.js", "test/**/*.js"],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "commonjs",
            globals: globals.node
        }
    },
    {
        files: ["test/e2e/**/*.js"],
        rules: {
            // Playwright fixtures must destructure their dependencies, even when empty
            "no-empty-pattern": "off"
        }
    },
    {
        files: ["test/unit/**/*.js"],
        languageOptions: {
            globals: globals.mocha
        }
    }
];

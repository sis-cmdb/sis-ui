"use strict";

var js = require("@eslint/js");
var globals = require("globals");
var tseslint = require("typescript-eslint");
var pluginVue = require("eslint-plugin-vue");

// the Vue rewrite (vue/) and its build config
var TS_FILES = ["vue/**/*.ts", "vue/**/*.vue", "vite.config.mts"];

function scoped(configs, files) {
    return configs.map(function(c) { return Object.assign({}, c, { files: files }); });
}

module.exports = [
    {
        ignores: ["node_modules/**", "dist/**", "dist-vue/**", ".e2e/**", "vendor/**", "test-results/**", "playwright-report/**"]
    },
    js.configs.recommended,
    {
        // the app: plain browser scripts concatenated into one bundle; and the
        // Vue app's unbundled config shim
        files: ["src/**/*.js", "vue/public/**/*.js"],
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
    },
    ...scoped(tseslint.configs.recommended, TS_FILES),
    // only the rules that catch mistakes: the templates keep their whitespace
    // (see vite.config.mts), so formatting rules that move content onto other
    // lines would change how pages render
    ...scoped(pluginVue.configs["flat/essential"], ["vue/**/*.vue"]),
    {
        files: TS_FILES,
        languageOptions: {
            globals: globals.browser
        }
    },
    {
        files: ["vue/**/*.vue"],
        languageOptions: {
            // TypeScript in <script lang="ts">
            parserOptions: { parser: tseslint.parser, extraFileExtensions: [".vue"] }
        },
        rules: {
            "vue/html-indent": ["error", 4, { alignAttributesVertically: true }]
        }
    }
];

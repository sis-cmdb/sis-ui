"use strict";

var js = require("@eslint/js");
var globals = require("globals");
var tseslint = require("typescript-eslint");
var pluginVue = require("eslint-plugin-vue");

// the app and its build config
var TS_FILES = ["src/**/*.ts", "src/**/*.vue", "scripts/**/*.mts", "vite.config.mts"];

function scoped(configs, files) {
    return configs.map(function(c) { return Object.assign({}, c, { files: files }); });
}

module.exports = [
    {
        ignores: ["node_modules/**", "dist/**", ".e2e/**", "test-results/**", "playwright-report/**"]
    },
    js.configs.recommended,
    ...scoped(tseslint.configs.recommended, TS_FILES),
    // only the rules that catch mistakes: the templates keep their whitespace
    // (see vite.config.mts), so formatting rules that move content onto other
    // lines would change how pages render
    ...scoped(pluginVue.configs["flat/essential"], ["src/**/*.vue"]),
    {
        files: ["src/**/*.ts", "src/**/*.vue"],
        languageOptions: {
            globals: globals.browser
        }
    },
    {
        files: ["src/**/*.vue"],
        languageOptions: {
            // TypeScript in <script lang="ts">
            parserOptions: { parser: tseslint.parser, extraFileExtensions: [".vue"] }
        },
        rules: {
            "vue/html-indent": ["error", 4, { alignAttributesVertically: true }]
        }
    },
    {
        // loaded as it is before the app, in every browser the UI supports
        files: ["public/**/*.js", "config.js.sample"],
        languageOptions: {
            ecmaVersion: 5,
            sourceType: "script",
            globals: globals.browser
        }
    },
    {
        files: ["scripts/**/*.mjs"],
        languageOptions: {
            sourceType: "module",
            globals: globals.node
        }
    },
    {
        files: ["scripts/**/*.mts", "vite.config.mts"],
        languageOptions: {
            globals: globals.node
        }
    },
    {
        // configs and tests run in node
        files: ["*.js", "test/**/*.js"],
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
    }
];

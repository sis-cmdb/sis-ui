/// <reference types="vite/client" />

declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent<object, object, unknown>;
    export default component;
}

// compiled by the sis-peggy plugin in vite.config.ts
declare module "*.pegjs" {
    export function parse(input: string, options?: { startRule?: string }): unknown;
    export class SyntaxError extends Error {}
}

// set by vite.config.mts: build info, and the Bootswatch themes (first is the default)
declare const __UI_BUILD__: { version: string; build_num: string; git_hash: string };
declare const __THEMES__: string[];

// the SIS API docs, rendered at build time (sis-docs plugin in vite.config.mts)
declare module "virtual:sis-docs" {
    export const docs: Array<{ name: string; title: string }>;
    // the page's html, or null for an unknown page
    export function loadDoc(name: string): Promise<string | null>;
}

interface Window {
    SIS_CONFIG?: { API_URL?: string };
}

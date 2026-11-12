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

// build info, set by vite.config.mts
declare const __UI_BUILD__: { version: string; build_num: string; git_hash: string };

interface Window {
    SIS_CONFIG?: { API_URL?: string };
}

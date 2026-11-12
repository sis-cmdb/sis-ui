// Modal dialogs, rendered by DialogHost with the markup of the ui-bootstrap
// modals the AngularJS UI used. A dialog component emits "close" with its
// result or "dismiss".

import { markRaw, reactive, type Component } from "vue";

export interface DialogOptions {
    // e.g. "wide-modal-window" (style.css)
    windowClass?: string;
    // Escape dismisses the dialog (default true)
    keyboard?: boolean;
    // clicking outside the dialog dismisses it, unless "static" (default true)
    backdrop?: boolean | "static";
}

export interface OpenDialog {
    id: number;
    component: Component;
    props: Record<string, unknown>;
    options: DialogOptions;
    resolve: (result: unknown) => void;
}

let nextId = 1;

export const openDialogs = reactive<OpenDialog[]>([]);

// Resolves with the dialog's result, or undefined when it is dismissed.
export function openDialog<R = unknown>(component: Component, props: Record<string, unknown> = {},
                                        options: DialogOptions = {}): Promise<R | undefined> {
    return new Promise(function(resolve) {
        openDialogs.push({
            id: nextId++,
            component: markRaw(component),
            props,
            options: { windowClass: "wide-modal-window", keyboard: true, backdrop: true, ...options },
            resolve: resolve as (result: unknown) => void
        });
    });
}

export function closeDialog(id: number, result?: unknown): void {
    const index = openDialogs.findIndex((d) => d.id === id);
    if (index >= 0) {
        const [dialog] = openDialogs.splice(index, 1);
        dialog!.resolve(result);
    }
}

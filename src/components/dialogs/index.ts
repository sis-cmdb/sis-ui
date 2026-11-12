// The common dialogs (ports of the AngularJS SisDialogs).

import { openDialog } from "@/dialogs";
import ConfirmDialog from "./ConfirmDialog.vue";
import ErrorDialog from "./ErrorDialog.vue";
import FilterReferenceDialog from "./FilterReferenceDialog.vue";

// resolves true when the user confirms
export async function confirm(title: string, body: string): Promise<boolean> {
    return (await openDialog<boolean>(ConfirmDialog, { title, body }, { windowClass: "" })) === true;
}

// asks before deleting an object; type is e.g. "schema" or a schema's name
export function confirmDelete(type: string, name: unknown): Promise<boolean> {
    return confirm("Confirm delete (" + type + ")", "Are you sure you want to delete " + name);
}

export async function showError(body: string, title = "An error occurred"): Promise<void> {
    await openDialog(ErrorDialog, { title, body }, { windowClass: "" });
}

// for a failed API request
export function showApiError(err: unknown): Promise<void> {
    return showError(err instanceof Error ? err.message : String(err));
}

export async function showFilterHelp(): Promise<void> {
    await openDialog(FilterReferenceDialog);
}

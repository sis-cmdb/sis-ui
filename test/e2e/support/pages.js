"use strict";

// Locators for the parts of the UI the e2e tests drive. The forms are generated
// from schema definitions and their inputs are not linked to labels, so fields
// are found through the label text in the same row.

function exact(text) {
    return new RegExp("^\\s*" + text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$");
}

// value input of a schema property on the schema add/edit page
// form: "schemaMod" (schema fields) or "metaMod" (SIS fields)
function schemaValue(page, label, form) {
    return page.locator("form[name=" + (form || "schemaMod") + "] [ng-form=valueForm]")
        .filter({ has: page.locator("label.schema-label", { hasText: exact(label) }) })
        .locator("input");
}

// the rows of the schema definition editor
function definitionRows(page) {
    return page.locator("form[name=schemaMod] sis-schema-field-name").locator("..");
}

// a leaf field on the entity add/edit/view page
// form: "entityMod" (definition fields) or "metaMod" (SIS fields)
function entityField(page, label, form) {
    return page.locator("form[name=" + (form || "entityMod") + "] [ng-form=innerForm]")
        .filter({ has: page.locator("label.entity-label", { hasText: exact(label) }) });
}

function entityInput(page, label, form) {
    return entityField(page, label, form).locator("sis-entity-input").locator("input, select");
}

function tableRow(page, text) {
    return page.locator("table tbody tr").filter({ has: page.getByText(text, { exact: true }) });
}

function modal(page) {
    return page.locator(".modal-dialog");
}

async function confirmDialog(page, expectedText) {
    var dlg = modal(page);
    if (expectedText) {
        await dlg.getByText(expectedText).waitFor();
    }
    await dlg.getByRole("button", { name: "Confirm" }).click();
    await dlg.waitFor({ state: "detached" });
}

module.exports = {
    exact: exact,
    schemaValue: schemaValue,
    definitionRows: definitionRows,
    entityField: entityField,
    entityInput: entityInput,
    tableRow: tableRow,
    modal: modal,
    confirmDialog: confirmDialog
};

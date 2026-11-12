"use strict";

var { expect } = require("@playwright/test");

// Locators for the parts of the UI the e2e tests drive. They only use what a
// user (or a screen reader) sees: labels, roles and accessible names, so they
// do not depend on the framework that renders the page.

function exact(text) {
    return new RegExp("^\\s*" + text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$");
}

// a form on the schema and entity add/edit/view pages
// name: "Fields" (schema or entity fields) or "SIS fields"
function form(page, name) {
    return page.getByRole("form", { name: name || "Fields", exact: true });
}

// value input of a schema property on the schema add/edit page
function schemaValue(page, label, formName) {
    return form(page, formName).getByLabel(label, { exact: true });
}

// the name inputs and type selects of the schema definition editor, in order
function definitionNames(page) {
    return form(page).getByRole("textbox", { name: "Field name", exact: true });
}

function definitionTypes(page) {
    return form(page).getByRole("combobox", { name: "Field type", exact: true });
}

// a leaf field on the entity add/edit/view page
function entityInput(page, label, formName) {
    return form(page, formName).getByLabel(label, { exact: true });
}

// a document or array field on the entity add/edit/view page
function entityGroup(page, label, formName) {
    return form(page, formName).getByRole("group", { name: label, exact: true });
}

// a table row containing a cell (or other element) with exactly this text
// scope: the page, or a locator such as a modal to search in
function tableRow(scope, text) {
    // the filter's locator is matched relative to each row, so it has to start
    // from the page, not from the scope
    var page = typeof scope.page === "function" ? scope.page() : scope;
    return scope.locator("table tbody tr").filter({ has: page.getByText(text, { exact: true }) });
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

// clicks into the code editor of the open modal, once the modal has finished
// opening (it takes the focus when it does), and returns the editor
async function focusCodeEditor(page) {
    await expect(page.locator(".modal")).toBeFocused();
    var editor = modal(page).locator(".ace_editor");
    await editor.click();
    await expect(editor.locator("textarea")).toBeFocused();
    return editor;
}

// whether a form control fails its constraints (required, pattern, ...)
function isValid(locator) {
    return locator.evaluate(function(el) { return el.validity.valid; });
}

module.exports = {
    exact: exact,
    form: form,
    schemaValue: schemaValue,
    definitionNames: definitionNames,
    definitionTypes: definitionTypes,
    entityInput: entityInput,
    entityGroup: entityGroup,
    tableRow: tableRow,
    modal: modal,
    confirmDialog: confirmDialog,
    focusCodeEditor: focusCodeEditor,
    isValid: isValid
};

// The entity form's model (used for entities, hooks and scripts): default
// values, how a value is shown in its input and stored back, validation and
// label widths. Ports the AngularJS EntityDescriptorController and the
// sisEntityInput directive.

import { Address4, Address6 } from "ip-address";
import { toRegex, toStringArray } from "./format";
import { newValue, type FieldDescriptor } from "./schema";

export type FormAction = "add" | "edit" | "view";

type Container = Record<string, unknown> | unknown[];

// code (a JSON document or a String with code) is edited in the code editor
export function isCode(field: FieldDescriptor): boolean {
    return field.type === "Mixed" || (!!field.code && field.type === "String");
}

// an ObjectId field referencing an entity of another schema
export function isReference(field: FieldDescriptor): boolean {
    return field.type === "ObjectId" && !!field.ref;
}

// Adds the fields an object lacks, with their starting values, as the
// AngularJS form did when it showed them: through documents and the documents
// in arrays.
export function fillDefaults(container: Container, fields: FieldDescriptor[]): void {
    if (Array.isArray(container)) {
        const item = fields[0];
        if (item?.type === "Document") {
            for (const value of container) {
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    fillDefaults(value as Record<string, unknown>, item.children || []);
                }
            }
        }
        return;
    }
    for (const field of fields) {
        const name = field.name!;
        if (!(name in container)) {
            container[name] = newValue(field);
        }
        const value = container[name];
        if (field.children && value && typeof value === "object") {
            fillDefaults(value as Container, field.children);
        }
    }
}

// References come from the API as the referenced entity; the form stores
// their _id. Turns them into ids, so an untouched object compares equal.
export function normalizeReferences(container: Container, fields: FieldDescriptor[]): void {
    if (Array.isArray(container)) {
        const item = fields[0];
        container.forEach(function(value, index) {
            if (item && isReference(item) && value && typeof value === "object") {
                container[index] = (value as { _id?: unknown })._id;
            } else if (item?.children && value && typeof value === "object") {
                normalizeReferences(value as Container, item.children);
            }
        });
        return;
    }
    for (const field of fields) {
        const value = container[field.name!];
        if (isReference(field) && value && typeof value === "object") {
            container[field.name!] = (value as { _id?: unknown })._id;
        } else if (field.children && value && typeof value === "object") {
            normalizeReferences(value as Container, field.children);
        }
    }
}

// path: the field's dotted path ("_sis.owner")
export function displayValue(field: FieldDescriptor, value: unknown, path: string): unknown {
    if (field.type === "Mixed" && value && typeof value === "object") {
        return JSON.stringify(value);
    }
    if (field.type === "IpAddress" && value && typeof value === "object") {
        const ip = value as { ip_address?: string; cidr?: number };
        return ip.ip_address + "/" + ip.cidr;
    }
    if (path === "_sis.owner" && field.type === "String" && Array.isArray(value) && !value.length) {
        return "";
    }
    return value;
}

// the value to store for what the input holds (references are stored by the form)
export function storedValue(field: FieldDescriptor, value: unknown, path: string): unknown {
    if (field.type === "Mixed" && typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }
    if ((path === "_sis.owner" && field.type === "String") || path === "_sis.tags") {
        return toStringArray(value as string | string[]);
    }
    return value;
}

function isEmpty(value: unknown): boolean {
    return value === undefined || value === null || value === "" || (typeof value === "number" && isNaN(value));
}

function isValidIp(text: string): boolean {
    return text.includes(":") ? Address6.isValid(text) : Address4.isValid(text);
}

export interface Checked {
    // the value to store; undefined while the input is invalid
    value: unknown;
    // the failed validations, e.g. { required: true }
    errors: Record<string, boolean>;
}

// Checks what an input holds (text for text and number inputs, a boolean for
// checkboxes) and turns it into the field's value, as AngularJS did: text is
// trimmed, numbers parsed, an empty number is null.
export function checkInput(field: FieldDescriptor, input: unknown): Checked {
    const errors: Record<string, boolean> = {};
    let value = typeof input === "string" && !isCode(field) ? input.trim() : input;
    if (field.type === "Number" && !field.enum && typeof value === "string") {
        if (value === "") {
            value = null;
        } else if (/^\s*(-|\+)?(\d+|(\d*(\.\d*)))\s*$/.test(value)) {
            value = parseFloat(value);
        } else {
            errors.number = true;
        }
    }
    if (field.required) {
        const empty = field.type === "Boolean" ? value !== true : isEmpty(value);
        if (empty) {
            errors.required = true;
        }
    }
    if (typeof value === "number") {
        if (typeof field.min === "number" && value < field.min) {
            errors.min = true;
        }
        if (typeof field.max === "number" && value > field.max) {
            errors.max = true;
        }
    }
    if (typeof value === "string" && value) {
        const regex = typeof field.match === "string" ? toRegex(field.match) : null;
        if (regex && !regex.test(value)) {
            errors.match = true;
        }
        if (field.type === "IpAddress" && !isValidIp(value)) {
            errors.ip = true;
        }
    }
    // invalid input does not reach the model, as with AngularJS parsers
    const invalid = errors.number || errors.match || errors.ip;
    return { value: invalid ? undefined : value, errors };
}

// The width of the labels next to a set of fields, in characters: the longest
// name, plus room for the buttons of documents and arrays.
export function maxNameLength(fields: FieldDescriptor[], action: FormAction): number {
    return fields.reduce(function(max, field) {
        let length = field.name ? field.name.length : 4;
        if (field.children?.length) {
            // collapse (and delete) buttons
            length += action === "view" ? 3 : 5;
        }
        return Math.max(max, length);
    }, 0);
}

// labels of array items when editing: the index and a delete button (the
// view page labels them like the array itself)
export const ITEM_LABEL_LENGTH = 7;

// The SIS fields of the forms. owner is a list of checkboxes of the groups the
// user may pick, or with null, a required text field (super users editing hooks
// and scripts). The view page shows it as text.
export function sisFields(ownerChoices: string[] | null, action: FormAction): FieldDescriptor {
    let owner: FieldDescriptor;
    if (action === "view") {
        owner = { name: "owner", type: "String" };
    } else if (ownerChoices) {
        owner = { name: "owner", type: "Array", enum: ownerChoices };
    } else {
        owner = { name: "owner", type: "String", required: true };
    }
    return {
        name: "_sis",
        type: "Document",
        children: [
            { name: "locked", type: "Boolean" },
            { name: "immutable", type: "Boolean" },
            { name: "tags", type: "String" },
            owner
        ]
    };
}

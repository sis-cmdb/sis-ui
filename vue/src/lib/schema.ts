// Helpers for schemas and their fields (ports of SisUtil). The recursive field
// descriptors of the schema and entity editors come with those editors.

import type { FieldSpec, Schema } from "./api/types";

export const FIELD_TYPES = ["Boolean", "String", "Number", "Mixed", "Document", "Array", "ObjectId", "IpAddress"] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

// the parts of a field that decide its input
export interface FieldInfo {
    type: string;
    enum?: unknown[];
}

function typeOf(spec: FieldSpec | undefined): string | undefined {
    if (typeof spec === "string") {
        return spec;
    }
    if (spec && !Array.isArray(spec) && typeof spec.type === "string") {
        return spec.type;
    }
    return undefined;
}

// The field that names an entity of the schema (shown in lists and titles):
// id_field, else the first required unique string, else name, title or _id.
// An IpAddress id shows its address.
export function idField(schema: Schema): string {
    const definition = schema.definition;
    const id = schema.id_field;
    if (id && id !== "_id" && !id.includes(".")) {
        return typeOf(definition[id]) === "IpAddress" ? id + ".ip_address" : id;
    }
    for (const [name, spec] of Object.entries(definition)) {
        if (spec && typeof spec === "object" && !Array.isArray(spec) &&
            spec.type === "String" && spec.required && spec.unique) {
            return name;
        }
    }
    if ("name" in definition) {
        return "name";
    }
    return "title" in definition ? "title" : "_id";
}

// a field of an object by dotted path ("location.rack"); null if missing
export function objectField(obj: unknown, path: string | null | undefined): unknown {
    if (!obj || !path) {
        return null;
    }
    let value: unknown = obj;
    for (const part of path.split(".")) {
        if (!value || typeof value !== "object") {
            return null;
        }
        value = (value as Record<string, unknown>)[part];
    }
    return value;
}

// A field of a schema definition in one shape, whatever form the definition
// used (see FieldSpec): its type, attributes and, for documents and arrays, its
// fields or item type.
export interface FieldDescriptor {
    // undefined for the item type of an array
    name?: string;
    type: string;
    children?: FieldDescriptor[];
    enum?: unknown[];
    ref?: string;
    required?: boolean;
    unique?: boolean;
    [attribute: string]: unknown;
}

function byName(a: FieldDescriptor, b: FieldDescriptor): number {
    const x = a.name ?? "";
    const y = b.name ?? "";
    return x < y ? -1 : x > y ? 1 : 0;
}

function arrayDescriptor(items: FieldSpec[], name?: string): FieldDescriptor {
    const result: FieldDescriptor = { type: "Array" };
    const item = items.length && items[0] ? describeField(items[0]) : { type: "Mixed" };
    // an enum of the items is the array's (a multiple choice)
    if (item.enum) {
        result.enum = item.enum;
        delete item.enum;
    }
    result.children = [item];
    if (name) {
        result.name = name;
    }
    return result;
}

function documentDescriptor(definition: Record<string, FieldSpec>, name?: string): FieldDescriptor {
    return { name, type: "Document", children: describeFields(definition) };
}

// one field of a definition
export function describeField(spec: FieldSpec, name?: string): FieldDescriptor {
    if (Array.isArray(spec)) {
        return arrayDescriptor(spec, name);
    }
    if (typeof spec === "string") {
        return { type: spec, name };
    }
    if (!("type" in spec)) {
        // an embedded document
        return documentDescriptor(spec as Record<string, FieldSpec>, name);
    }
    const { type, ...attributes } = spec;
    if (typeof type === "string") {
        return { name, ...attributes, type };
    }
    if (Array.isArray(type)) {
        return { ...arrayDescriptor(type as FieldSpec[], name), ...attributes };
    }
    const inner = type as Record<string, unknown>;
    if (typeof inner.type === "string") {
        // a document with a field named "type": spec itself is the document
        return documentDescriptor(spec as Record<string, FieldSpec>, name);
    }
    return { ...documentDescriptor(inner as Record<string, FieldSpec>, name), ...attributes };
}

// the fields of a definition, sorted by name
export function describeFields(definition: Record<string, FieldSpec> | null | undefined): FieldDescriptor[] {
    return Object.entries(definition || {}).map(([name, spec]) => describeField(spec, name)).sort(byName);
}

// the value a new field (or array item) starts with
export function newValue(field: FieldInfo): unknown {
    switch (field.type) {
        case "Document": return {};
        case "Array": return [];
    }
    if (field.enum?.length) {
        return field.enum[0];
    }
    switch (field.type) {
        case "ObjectId": return null;
        // matches the unchecked checkbox; the API rejects "" for booleans
        case "Boolean": return false;
        default: return "";
    }
}

export function inputType(type: string): "checkbox" | "number" | "text" {
    return type === "Boolean" ? "checkbox" : type === "Number" ? "number" : "text";
}

export type AttributeInput = "checkbox" | "text" | "number" | "textArray" | "regex" | "select";

export interface Attribute {
    name: string;
    input: AttributeInput;
}

// the attributes a field of the type can have (the field attributes dialog)
export function attributesForType(type: string): Attribute[] {
    const result: Attribute[] = [
        { name: "required", input: "checkbox" },
        { name: "unique", input: "checkbox" },
        { name: "comment", input: "text" }
    ];
    if (type === "Number") {
        result.push({ name: "min", input: "number" }, { name: "max", input: "number" });
    } else if (type === "String") {
        result.push(
            { name: "lowercase", input: "checkbox" },
            { name: "trim", input: "checkbox" },
            { name: "uppercase", input: "checkbox" },
            { name: "enum", input: "textArray" },
            { name: "match", input: "regex" },
            { name: "code", input: "text" }
        );
    } else if (type === "ObjectId") {
        // the referenced schema
        result.push({ name: "ref", input: "select" });
    }
    return result;
}

// The SIS fields every object has, as edited in the forms. owner is a list of
// groups (see ownerSubset for what a user may pick).
export const SIS_META_FIELDS: Readonly<Record<string, FieldSpec>> = {
    locked: "Boolean",
    immutable: "Boolean",
    tags: "String",
    owner: ["String"]
};

// Hooks and scripts are edited with the entity forms, using these schemas.
export function hookSchema(owner: string[]): Schema {
    return {
        name: "sis_hooks",
        _sis: { owner },
        definition: {
            name: { type: "String", required: true, unique: true, match: "/^[0-9a-z_]+$/" },
            target: {
                type: {
                    url: { type: "String", required: true },
                    action: { type: "String", required: true, enum: ["GET", "POST", "PUT"] }
                },
                required: true
            },
            retry_count: { type: "Number", min: 0, max: 20, default: 0 },
            retry_delay: { type: "Number", min: 1, max: 60, default: 1 },
            events: { type: [{ type: "String", enum: ["insert", "update", "delete"] }], required: true },
            entity_type: { type: "String", required: true }
        }
    };
}

export function scriptSchema(owner: string[]): Schema {
    return {
        name: "sis_scripts",
        _sis: { owner },
        definition: {
            name: { type: "String", required: true, unique: true, match: "/^[a-z0-9_-]+$/" },
            description: { type: "String" },
            script_type: { type: "String", required: true, enum: ["application/javascript"] },
            script: { type: "String", code: true, code_type_field: "script_type" }
        }
    };
}

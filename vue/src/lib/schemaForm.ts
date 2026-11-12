// The schema editor's model: the definition as a tree of fields that can be
// renamed, retyped, added and removed, and turned back into a definition.
// Ports the AngularJS SchemaDescriptorController.

import type { FieldSpec, SchemaDefinition } from "./api/types";
import { toStringArray } from "./format";
import { attributesForType, describeFields, type FieldDescriptor } from "./schema";

export interface SchemaField {
    // stable across edits, for rendering
    id: number;
    // empty for the item type of an array
    name: string;
    type: string;
    // added in this edit: its name can still change
    isNew: boolean;
    // the attributes the type can have (attributesForType), e.g. required
    attrs: Record<string, unknown>;
    // the fields of a document, or the item type of an array (at most one)
    children?: SchemaField[];
}

let nextId = 1;

function attributesOf(descriptor: FieldDescriptor): Record<string, unknown> {
    const attrs: Record<string, unknown> = {};
    for (const { name } of attributesForType(descriptor.type)) {
        if (descriptor[name] !== undefined) {
            attrs[name] = descriptor[name];
        }
    }
    return attrs;
}

function fromDescriptor(descriptor: FieldDescriptor, isNew: boolean): SchemaField {
    const field: SchemaField = {
        id: nextId++,
        name: descriptor.name ?? "",
        type: descriptor.type,
        isNew,
        attrs: attributesOf(descriptor)
    };
    if (descriptor.type === "Document" || descriptor.type === "Array") {
        field.children = (descriptor.children || []).map((child) => fromDescriptor(child, isNew));
    }
    // a multiple choice: the choices belong to the item type
    if (descriptor.type === "Array" && descriptor.enum && field.children?.[0]) {
        field.children[0].attrs.enum = descriptor.enum;
    }
    return field;
}

// the fields of a definition; isNew for a new schema, whose fields can all be renamed
export function fieldsFromDefinition(definition: SchemaDefinition | undefined, isNew: boolean): SchemaField[] {
    return describeFields(definition).map((d) => fromDescriptor(d, isNew));
}

// a field as the API takes it: a type name if it has no attributes
export function toFieldSpec(field: SchemaField): FieldSpec {
    const result: Record<string, unknown> = { type: field.type };
    const children = field.children || [];
    if (field.type === "Array") {
        result.type = children.length ? [toFieldSpec(children[0]!)] : [];
    } else if (field.type === "Document" && children.length) {
        result.type = toDefinition(children);
    }
    for (const attribute of attributesForType(field.type)) {
        const value = field.attrs[attribute.name];
        if (!value && value !== 0) {
            continue;
        }
        result[attribute.name] = attribute.input === "textArray" ? toStringArray(value as string | string[]) : value;
    }
    if (Object.keys(result).length === 1) {
        // a field named "type" keeps the long form, or it reads as a document's type
        return field.name === "type" ? { type: result.type } : (result.type as FieldSpec);
    }
    return result;
}

export function toDefinition(fields: SchemaField[]): SchemaDefinition {
    const definition: SchemaDefinition = {};
    for (const field of fields) {
        definition[field.name] = toFieldSpec(field);
    }
    return definition;
}

// a new field of a document, or the item type of an array
export function newField(): SchemaField {
    return { id: nextId++, name: "", type: "String", isNew: true, attrs: {} };
}

// Changes a field's type: documents start with one field, arrays without an
// item type; the attributes are cleared.
export function setType(field: SchemaField, type: string): void {
    field.type = type;
    field.attrs = {};
    if (type === "Document") {
        field.children = [{ ...newField(), name: "field" }];
    } else if (type === "Array") {
        field.children = [];
    } else {
        delete field.children;
    }
}

export function renameField(field: SchemaField, name: string): void {
    field.name = name.trim();
}

// removes a field from the fields holding it
export function removeField(siblings: SchemaField[], field: SchemaField): void {
    const index = siblings.indexOf(field);
    if (index >= 0) {
        siblings.splice(index, 1);
    }
}

// adds a new field to a document, or the item type to an array
export function addChild(field: SchemaField): void {
    field.children = [...(field.children || []), newField()];
}

export function setAttributes(field: SchemaField, attrs: Record<string, unknown>): void {
    field.attrs = attrs;
}

// the ids of fields sharing their name with a sibling
export function duplicateIds(fields: SchemaField[]): Set<number> {
    const result = new Set<number>();
    const byName = new Map<string, SchemaField[]>();
    for (const field of fields) {
        byName.set(field.name, [...(byName.get(field.name) || []), field]);
        for (const id of duplicateIds(field.children || [])) {
            result.add(id);
        }
    }
    for (const same of byName.values()) {
        if (same.length > 1) {
            same.forEach((f) => result.add(f.id));
        }
    }
    return result;
}

// the dotted paths of every field, including those inside documents (for Lock All)
export function fieldPaths(fields: SchemaField[], prefix = ""): string[] {
    return fields.flatMap(function(field) {
        const path = prefix + field.name;
        return field.type === "Document" ? [path, ...fieldPaths(field.children || [], path + ".")] : [path];
    });
}

// the width of the name column for a set of fields, in characters: new fields
// get room for a name to be typed
export function nameColumnLength(fields: Array<{ name: string; isNew?: boolean }>): number {
    return fields.reduce((max, field) => Math.max(max, field.isNew ? 15 : field.name.length), 0);
}

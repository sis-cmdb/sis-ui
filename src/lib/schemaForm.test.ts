import { describe, expect, it } from "vitest";
import type { SchemaDefinition } from "./api/types";
import { addChild, duplicateIds, fieldPaths, fieldsFromDefinition, nameColumnLength, newField, removeField, renameField,
         setAttributes, setType, toDefinition, type SchemaField } from "./schemaForm";

function byName(fields: SchemaField[], name: string): SchemaField {
    return fields.find((f) => f.name === name)!;
}

describe("schema form", function() {
    it("turns a definition into fields and back", function() {
        const definition: SchemaDefinition = {
            hostname: { type: "String", required: true, unique: true, comment: "FQDN" },
            cpus: { type: "Number", min: 0, max: 64 },
            env: { type: [{ type: "String", enum: ["prod", "dev"] }], required: true },
            tags: ["String"],
            any: [],
            location: { rack: { type: "ObjectId", ref: "rack" }, row: "String" },
            target: { type: { url: "String" }, required: true },
            type: "String",
            notes: "String"
        };
        const fields = fieldsFromDefinition(definition, false);

        expect(fields.map((f) => f.name)).toEqual(["any", "cpus", "env", "hostname", "location", "notes", "tags", "target", "type"]);
        // the choices of a multiple choice belong to its item type
        expect(byName(fields, "env").children![0]!.attrs).toEqual({ enum: ["prod", "dev"] });
        expect(byName(fields, "any").children).toEqual([expect.objectContaining({ name: "", type: "Mixed" })]);
        expect(toDefinition(fields)).toEqual({
            any: ["Mixed"],
            cpus: { type: "Number", min: 0, max: 64 },
            env: { type: [{ type: "String", enum: ["prod", "dev"] }], required: true },
            hostname: { type: "String", required: true, unique: true, comment: "FQDN" },
            location: { rack: { type: "ObjectId", ref: "rack" }, row: "String" },
            notes: "String",
            tags: ["String"],
            target: { type: { url: "String" }, required: true },
            // a field named type keeps the long form
            type: { type: "String" }
        });
    });

    it("leaves out empty attributes and splits enum text", function() {
        const [field] = fieldsFromDefinition({ env: "String" }, true);
        field!.attrs = { required: false, unique: true, comment: "", enum: "prod, dev", match: "/^a/" };
        expect(toDefinition([field!])).toEqual({ env: { type: "String", unique: true, enum: ["prod", "dev"], match: "/^a/" } });
    });

    it("marks fields of a new schema as new", function() {
        expect(fieldsFromDefinition({ name: "String", doc: { a: "String" } }, true).every((f) => f.isNew)).toBe(true);
        expect(fieldsFromDefinition({ name: "String" }, false)[0]!.isNew).toBe(false);
    });

    it("starts a document with a field and an array without an item type when the type changes", function() {
        const field = { ...newField(), name: "f", attrs: { required: true } };
        setType(field, "Document");
        expect(field.children).toEqual([expect.objectContaining({ name: "field", type: "String", isNew: true })]);
        expect(field.attrs).toEqual({});
        expect(toDefinition([field])).toEqual({ f: { field: "String" } });
        setType(field, "Array");
        expect(field.children).toEqual([]);
        expect(toDefinition([field])).toEqual({ f: [] });
        setType(field, "Number");
        expect(field.children).toBeUndefined();
        expect(toDefinition([field])).toEqual({ f: "Number" });
    });

    it("renames, removes and adds fields", function() {
        const fields = fieldsFromDefinition({ a: "String", doc: { x: "String" } }, true);
        const doc = byName(fields, "doc");
        renameField(byName(fields, "a"), "  b ");
        addChild(doc);
        renameField(doc.children![1]!, "y");
        removeField(fields, byName(fields, "b"));
        removeField(fields, { ...newField(), name: "missing" });
        setAttributes(doc, { required: true });
        expect(toDefinition(fields)).toEqual({ doc: { type: { x: "String", y: "String" }, required: true } });
    });

    it("finds fields with the same name as a sibling", function() {
        const fields = fieldsFromDefinition({ a: "String", doc: { x: "String", y: "String" } }, true);
        expect(duplicateIds(fields).size).toBe(0);
        byName(fields, "doc").children![1]!.name = "x";
        fields.push({ ...newField(), name: "a" });
        const dupes = duplicateIds(fields);
        expect([...dupes].sort()).toEqual([byName(fields, "a").id, fields[2]!.id, ...byName(fields, "doc").children!.map((c) => c.id)].sort());
    });

    it("lists the paths of every field for Lock All, through documents but not arrays", function() {
        const fields = fieldsFromDefinition({ a: "String", doc: { b: "Number", inner: { c: "String" } }, list: [{ d: "String" }] }, false);
        expect(fieldPaths(fields)).toEqual(["a", "doc", "doc.b", "doc.inner", "doc.inner.c", "list"]);
    });

    it("sizes the name column, with room for typing new names", function() {
        expect(nameColumnLength([{ name: "hostname" }, { name: "ip" }])).toBe(8);
        expect(nameColumnLength([{ name: "a", isNew: true }])).toBe(15);
        expect(nameColumnLength([])).toBe(0);
    });
});

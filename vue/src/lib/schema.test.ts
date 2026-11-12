import { describe, expect, it } from "vitest";
import type { Schema, SchemaDefinition } from "./api/types";
import { attributesForType, hookSchema, idField, inputType, newValue, objectField, scriptSchema } from "./schema";

function schema(definition: SchemaDefinition, id_field?: string): Schema {
    return { name: "s", definition, id_field, _sis: { owner: [] } };
}

describe("schema", function() {
    describe("idField", function() {
        it("uses id_field", function() {
            expect(idField(schema({ hostname: "String" }, "hostname"))).toBe("hostname");
        });

        it("shows the address of an IpAddress id, in either form of the field", function() {
            expect(idField(schema({ ip: { type: "IpAddress", required: true, unique: true } }, "ip"))).toBe("ip.ip_address");
            expect(idField(schema({ ip: "IpAddress" }, "ip"))).toBe("ip.ip_address");
        });

        it("falls back to the first required unique string, then name, title or _id", function() {
            expect(idField(schema({ a: "String", key: { type: "String", required: true, unique: true } }, "_id"))).toBe("key");
            expect(idField(schema({ key: { type: "String", required: true }, name: "String" }))).toBe("name");
            expect(idField(schema({ title: "String" }))).toBe("title");
            expect(idField(schema({ a: "Number" }))).toBe("_id");
            // nested ids are not supported
            expect(idField(schema({ a: { b: "String" } }, "a.b"))).toBe("_id");
        });
    });

    it("reads fields by dotted path", function() {
        const obj = { a: { b: { c: 3 } }, ip: { ip_address: "10.0.0.1" }, n: null };
        expect(objectField(obj, "a.b.c")).toBe(3);
        expect(objectField(obj, "ip.ip_address")).toBe("10.0.0.1");
        expect(objectField(obj, "a.x.c")).toBeNull();
        expect(objectField(obj, "n.x")).toBeNull();
        expect(objectField(null, "a")).toBeNull();
        expect(objectField(obj, "")).toBeNull();
    });

    it.each([
        [{ type: "Boolean" }, false],
        [{ type: "String" }, ""],
        [{ type: "Number" }, ""],
        [{ type: "ObjectId" }, null],
        [{ type: "String", enum: ["b", "a"] }, "b"],
        [{ type: "Document" }, {}],
        [{ type: "Array" }, []],
        [{ type: "Array", enum: ["x"] }, []]
    ])("starts a %j field as %j", function(field, value) {
        expect(newValue(field)).toEqual(value);
    });

    it("picks inputs by type", function() {
        expect(inputType("Boolean")).toBe("checkbox");
        expect(inputType("Number")).toBe("number");
        expect(inputType("IpAddress")).toBe("text");
    });

    it("lists the attributes of each field type", function() {
        const names = (type: string) => attributesForType(type).map((a) => a.name);
        expect(names("Boolean")).toEqual(["required", "unique", "comment"]);
        expect(names("Number")).toEqual(["required", "unique", "comment", "min", "max"]);
        expect(names("String")).toEqual(["required", "unique", "comment", "lowercase", "trim", "uppercase", "enum", "match", "code"]);
        expect(attributesForType("ObjectId").at(-1)).toEqual({ name: "ref", input: "select" });
        expect(attributesForType("String").find((a) => a.name === "match")?.input).toBe("regex");
    });

    it("describes hooks and scripts as schemas owned by the given groups", function() {
        expect(hookSchema(["ops"])._sis.owner).toEqual(["ops"]);
        expect(Object.keys(hookSchema([]).definition).sort()).toEqual(["entity_type", "events", "name", "retry_count", "retry_delay", "target"]);
        expect(scriptSchema(["ops"]).definition.script).toEqual({ type: "String", code: true, code_type_field: "script_type" });
    });
});

import { describe, expect, it } from "vitest";
import { checkInput, displayValue, fillDefaults, isCode, isReference, maxNameLength, normalizeReferences, sisFields,
         storedValue } from "./entityForm";
import { describeFields } from "./schema";

const fields = describeFields({
    hostname: { type: "String", required: true },
    cpus: { type: "Number", min: 1, max: 64 },
    active: "Boolean",
    env: { type: "String", enum: ["prod", "dev"] },
    location: { rack: "String", row: "Number" },
    tags: ["String"],
    disks: [{ dev: "String", size: "Number" }],
    data: "Mixed",
    rack: { type: "ObjectId", ref: "racks" }
});

function field(name: string) {
    return fields.find((f) => f.name === name)!;
}

describe("entity form", function() {
    describe("fillDefaults", function() {
        it("adds missing fields with their starting values", function() {
            const entity: Record<string, unknown> = { hostname: "h1", cpus: 4 };
            fillDefaults(entity, fields);
            expect(entity).toEqual({
                hostname: "h1", cpus: 4, active: false, data: "", disks: [], env: "prod",
                location: { rack: "", row: "" }, rack: null, tags: []
            });
        });

        it("fills documents inside arrays and keeps what is there", function() {
            const entity: Record<string, unknown> = { disks: [{ dev: "sda" }, { size: 2 }], location: { rack: "r1" } };
            fillDefaults(entity, fields);
            expect(entity.disks).toEqual([{ dev: "sda", size: "" }, { size: 2, dev: "" }]);
            expect(entity.location).toEqual({ rack: "r1", row: "" });
        });
    });

    it("turns populated references into ids, also in documents and arrays", function() {
        const refs = describeFields({
            rack: { type: "ObjectId", ref: "racks" },
            loc: { r: { type: "ObjectId", ref: "racks" } },
            list: [{ type: "ObjectId", ref: "racks" }],
            other: "ObjectId"
        });
        const obj: Record<string, unknown> = {
            rack: { _id: "1", name: "r1" }, loc: { r: { _id: "2" } }, list: [{ _id: "3" }, "4"], other: "5"
        };
        normalizeReferences(obj, refs);
        expect(obj).toEqual({ rack: "1", loc: { r: "2" }, list: ["3", "4"], other: "5" });
    });

    it("shows JSON, addresses and an empty owner as text", function() {
        expect(displayValue(field("data"), { a: 1 }, "data")).toBe('{"a":1}');
        expect(displayValue({ type: "IpAddress" }, { ip_address: "10.0.0.1", cidr: 32 }, "ip")).toBe("10.0.0.1/32");
        expect(displayValue({ type: "IpAddress" }, "10.0.0.0/24", "ip")).toBe("10.0.0.0/24");
        expect(displayValue({ type: "String" }, [], "_sis.owner")).toBe("");
        expect(displayValue({ type: "Array" }, [], "_sis.owner")).toEqual([]);
    });

    it("stores JSON as objects and owner and tags as lists", function() {
        expect(storedValue(field("data"), '{"a":[1]}', "data")).toEqual({ a: [1] });
        expect(storedValue(field("data"), "{bad", "data")).toBeNull();
        expect(storedValue({ type: "String" }, "ops, dba", "_sis.owner")).toEqual(["ops", "dba"]);
        expect(storedValue({ type: "String" }, "a,,b", "_sis.tags")).toEqual(["a", "b"]);
        expect(storedValue({ type: "String" }, " x ", "notes")).toBe(" x ");
    });

    describe("checkInput", function() {
        it("trims text and requires required fields", function() {
            expect(checkInput(field("hostname"), "  web1 ")).toEqual({ value: "web1", errors: {} });
            expect(checkInput(field("hostname"), "   ")).toEqual({ value: "", errors: { required: true } });
        });

        it("parses numbers and checks min and max", function() {
            expect(checkInput(field("cpus"), "8")).toEqual({ value: 8, errors: {} });
            expect(checkInput(field("cpus"), "")).toEqual({ value: null, errors: {} });
            expect(checkInput(field("cpus"), "0").errors).toEqual({ min: true });
            expect(checkInput(field("cpus"), "65").errors).toEqual({ max: true });
            expect(checkInput(field("cpus"), "x")).toEqual({ value: undefined, errors: { number: true } });
        });

        it("checks addresses, keeping invalid ones out of the model", function() {
            const ip = { type: "IpAddress" };
            for (const bad of ["10.0.0.999", "not-an-ip", "2001:db8::zz", "010.0.0.1"]) {
                expect(checkInput(ip, bad), bad).toEqual({ value: undefined, errors: { ip: true } });
            }
            for (const good of ["10.0.0.1", "10.0.0.0/24", "2001:db8::1"]) {
                expect(checkInput(ip, good), good).toEqual({ value: good, errors: {} });
            }
            expect(checkInput(ip, "")).toEqual({ value: "", errors: {} });
        });

        it("checks match patterns", function() {
            const name = { type: "String", match: "/^[a-z]+$/" };
            expect(checkInput(name, "abc").errors).toEqual({});
            expect(checkInput(name, "ab1")).toEqual({ value: undefined, errors: { match: true } });
        });

        it("requires a required checkbox to be checked", function() {
            expect(checkInput({ type: "Boolean", required: true }, false).errors).toEqual({ required: true });
            expect(checkInput({ type: "Boolean" }, false)).toEqual({ value: false, errors: {} });
        });

        it("leaves code as it is", function() {
            expect(checkInput(field("data"), ' {"a":1} ').value).toBe(' {"a":1} ');
        });
    });

    it("tells code and reference fields", function() {
        expect(isCode(field("data"))).toBe(true);
        expect(isCode({ type: "String", code: true })).toBe(true);
        expect(isCode({ type: "String" })).toBe(false);
        expect(isReference(field("rack"))).toBe(true);
        expect(isReference({ type: "ObjectId" })).toBe(false);
    });

    it("sizes labels to the longest name, with room for buttons", function() {
        expect(maxNameLength(fields, "edit")).toBe(13);
        expect(maxNameLength(fields, "view")).toBe(11);
        expect(maxNameLength([{ type: "String" }], "edit")).toBe(4);
    });

    it("offers owners as checkboxes, as required text or, on the view page, as text", function() {
        const owner = (choices: string[] | null, action: "add" | "view") =>
            sisFields(choices, action).children!.find((f) => f.name === "owner");
        expect(owner(["ops"], "add")).toEqual({ name: "owner", type: "Array", enum: ["ops"] });
        expect(owner(null, "add")).toEqual({ name: "owner", type: "String", required: true });
        expect(owner(["ops"], "view")).toEqual({ name: "owner", type: "String" });
        expect(maxNameLength(sisFields(["ops"], "add").children!, "add")).toBe(9);
    });
});

import { describe, expect, it } from "vitest";
import { looseEquals } from "./equals";

describe("looseEquals", function() {
    it("compares deeply", function() {
        expect(looseEquals({ a: [1, { b: "x" }] }, { a: [1, { b: "x" }] })).toBe(true);
        expect(looseEquals({ a: [1, { b: "x" }] }, { a: [1, { b: "y" }] })).toBe(false);
        expect(looseEquals([1, 2], [1, 2, 3])).toBe(false);
        expect(looseEquals({ a: 1 }, [1])).toBe(false);
        expect(looseEquals(null, {})).toBe(false);
        expect(looseEquals(NaN, NaN)).toBe(true);
        expect(looseEquals("1", 1)).toBe(false);
    });

    it("treats undefined properties as missing and ignores $ keys", function() {
        expect(looseEquals({ a: 1, b: undefined }, { a: 1 })).toBe(true);
        expect(looseEquals({ a: 1 }, { a: 1, $hash: 3 })).toBe(true);
        expect(looseEquals({ a: 1 }, { a: 1, b: null })).toBe(false);
    });
});

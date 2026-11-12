import { describe, expect, it } from "vitest";
import { parseQueryText, parseSearch } from "./parseSearch";

describe("query language", function() {
    describe("parser", function() {
        it.each([
            ["a=b", ["a", "=", "b"]],
            ["a = b", ["a", "=", "b"]],
            ["name like \"foo.*\"", ["name", "like", "foo.*"]],
            ["a LIKE b", ["a", "LIKE", "b"]],
            ["x >= 1", ["x", ">=", "1"]],
            ["x!=1", ["x", "!=", "1"]],
            ["x != 1", ["x", "!=", "1"]],
            ["a.b.c=1", ["a.b.c", "=", "1"]],
            ["t = \"a b?c\"", ["t", "=", "a b?c"]],
            ["f = g(h)", ["f", "=", "g(h)"]],
            ["x in [1,2]", ["x", "in", "[1,2]"]],
            ["a=b and c=d", [["a", "=", "b"], "and", ["c", "=", "d"]]],
            ["a=b OR c=d", [["a", "=", "b"], "OR", ["c", "=", "d"]]],
            ["a=b and c=d or e=f", [["a", "=", "b"], "and", [["c", "=", "d"], "or", ["e", "=", "f"]]]],
            ["(a=b)", ["a", "=", "b"]],
            ["( a=b )", ["a", "=", "b"]],
            ["(a=b and c=d) or e=f", [[["a", "=", "b"], "and", ["c", "=", "d"]], "or", ["e", "=", "f"]]],
            ["a=b and (c=d or e=f)", [["a", "=", "b"], "and", [["c", "=", "d"], "or", ["e", "=", "f"]]]],
            ["a=b\tand\nc=d", [["a", "=", "b"], "and", ["c", "=", "d"]]]
        ])("parses %j", function(input, expected) {
            expect(parseQueryText(input)).toEqual(expected);
        });

        it.each(["", "a", "a=", "=b", "a==b", "a=b and", "and a=b", "a=b c=d", "a=b && c=d",
                 "(a=b", "a=b)", "a = \"b"])("rejects %j", function(input) {
            expect(() => parseQueryText(input)).toThrow(expect.objectContaining({ name: "SyntaxError" }));
        });
    });

    describe("parseSearch", function() {
        it.each([
            ["name = web1", { name: "web1" }],
            ["cpus = 4", { cpus: 4 }],
            ["cpus > 4", { cpus: { $gt: 4 } }],
            ["cpus >= 4", { cpus: { $gte: 4 } }],
            ["cpus < 4", { cpus: { $lt: 4 } }],
            ["cpus <= 4", { cpus: { $lte: 4 } }],
            ["env != prod", { env: { $ne: "prod" } }],
            ["name like \"web.*\"", { name: { $regex: "web.*", $options: "i" } }],
            ["name like 123", { name: { $regex: "123", $options: "i" } }],
            ["name in \"a, b,3\"", { name: { $in: ["a", "b", 3] } }],
            ["cpus in 2", { cpus: { $in: [2] } }],
            ["env NIN prod,dev", { env: { $nin: ["prod", "dev"] } }],
            ["a = 1 and b = 2", { $and: [{ a: 1 }, { b: 2 }] }],
            ["(c > 10 and c < 20) or n = \"x\"",
             { $or: [{ $and: [{ c: { $gt: 10 } }, { c: { $lt: 20 } }] }, { n: "x" }] }]
        ])("converts %j", function(input, expected) {
            expect(parseSearch(input)).toEqual(expected);
        });

        it("returns null for empty and invalid input", function() {
            expect(parseSearch("")).toBeNull();
            expect(parseSearch(null)).toBeNull();
            expect(parseSearch("cpus >")).toBeNull();
        });
    });
});

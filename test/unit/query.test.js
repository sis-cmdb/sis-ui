"use strict";

// The filter box query language: SisQueryParser (src/pegjs/query.pegjs) and its
// conversion to SIS query objects (EndpointPager.parseSearch).

var assert = require("node:assert/strict");
var { loadApp } = require("./helpers/app");

describe("query language", function() {
    var app, parser, parseSearch;

    before(async function() {
        app = await loadApp();
        var injector = app.injector();
        parser = injector.get("SisQueryParser");
        parseSearch = injector.get("EndpointPager").parseSearch;
    });

    after(function() {
        app.close();
    });

    // results come from another realm (jsdom), so compare plain copies
    function plain(value) {
        return JSON.parse(JSON.stringify(value));
    }

    describe("parser", function() {
        var parses = [
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
        ];
        parses.forEach(function(c) {
            it("parses " + JSON.stringify(c[0]), function() {
                assert.deepEqual(plain(parser.parse(c[0])), c[1]);
            });
        });

        ["", "a", "a=", "=b", "a==b", "a=b and", "and a=b", "a=b c=d", "a=b && c=d",
         "(a=b", "a=b)", "a = \"b"].forEach(function(input) {
            it("rejects " + JSON.stringify(input), function() {
                assert.throws(function() { parser.parse(input); }, function(err) {
                    return err.name === "SyntaxError";
                });
            });
        });
    });

    describe("parseSearch", function() {
        var queries = [
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
        ];
        queries.forEach(function(c) {
            it("converts " + JSON.stringify(c[0]), function() {
                assert.deepEqual(plain(parseSearch(c[0])), c[1]);
            });
        });

        it("returns null for empty and invalid input", function() {
            assert.equal(parseSearch(""), null);
            assert.equal(parseSearch(null), null);
            assert.equal(parseSearch("cpus >"), null);
        });

        it("passes query objects through", function() {
            var q = { a: 1 };
            assert.equal(parseSearch(q), q);
        });
    });
});

"use strict";

// SisUtil, SisSession, filters and the entity input directive.

var assert = require("node:assert/strict");
var { loadApp } = require("./helpers/app");

describe("components", function() {
    var app, injector, $rootScope;

    before(async function() {
        app = await loadApp();
    });

    after(function() {
        app.close();
    });

    beforeEach(function() {
        injector = app.injector();
        $rootScope = injector.get("$rootScope");
    });

    function loginAs(user) {
        app.window.localStorage.setItem("t", JSON.stringify(Object.assign({
            token: "t", expirationTime: Date.now() + 60000
        }, user)));
    }

    describe("SisUtil", function() {
        var SisUtil;
        beforeEach(function() {
            SisUtil = injector.get("SisUtil");
        });

        describe("goBack", function() {
            var back, go;
            beforeEach(function() {
                back = 0;
                go = [];
                app.window.history.back = function() { back++; };
                injector.get("$state").go = function(state) { go.push(state); };
            });

            it("goes to the given state when the page was opened directly", function() {
                SisUtil.goBack("app.schemas.list");
                assert.deepEqual(go, ["app.schemas.list"]);
                assert.equal(back, 0);
            });

            it("goes back when the user came from another page of the app", function() {
                $rootScope.$broadcast("$stateChangeSuccess", { name: "app.login" }, {}, { name: "app.hooks.list" }, {});
                SisUtil.goBack("app.schemas.list");
                assert.equal(back, 1);
                assert.deepEqual(go, []);
            });
        });

        it("describes failed validations in words", function() {
            var msg = function(errors, desc) { return SisUtil.validationMessage({ $error: errors }, desc); };
            assert.equal(msg({}), "");
            assert.equal(msg({ required: false, ip: true }), "Not a valid IP address");
            assert.equal(msg({ required: true }), "Required");
            assert.equal(msg({ match: true }, { match: "/^a+$/" }), "Must match /^a+$/");
            assert.equal(msg({ min: true }, { min: 1 }), "Must be at least 1");
            assert.equal(msg({ max: true }, { max: 9 }), "Must be at most 9");
            assert.equal(msg({ number: true }), "Must be a number");
            assert.equal(msg({ weird: true }), "Invalid (weird)");
            assert.equal(SisUtil.validationMessage(undefined), "");
        });

        it("escapes the keys of a diff but leaves values to the formatter", function() {
            var delta = { "<b>": { "<i>": [1, 2] }, _t: "a", plain: ["<v>"] };
            var escaped = JSON.parse(JSON.stringify(SisUtil.escapeDeltaKeys(delta)));
            assert.deepEqual(escaped, { "&lt;b&gt;": { "&lt;i&gt;": [1, 2] }, _t: "a", plain: ["<v>"] });
            assert.equal(SisUtil.escapeDeltaKeys(null), null);
        });

        it("escapes html", function() {
            assert.equal(SisUtil.escapeHtml("<img src=\"x\" onerror='y'>&"),
                         "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;");
            assert.equal(SisUtil.escapeHtml(5), "5");
        });

        describe("getNewItemForDesc", function() {
            var cases = [
                [{ type: "Boolean" }, false],
                [{ type: "String" }, ""],
                [{ type: "Number" }, ""],
                [{ type: "ObjectId" }, null],
                [{ type: "String", enum: ["b", "a"] }, "b"]
            ];
            cases.forEach(function(c) {
                it("starts a " + JSON.stringify(c[0]) + " field as " + JSON.stringify(c[1]), function() {
                    assert.equal(SisUtil.getNewItemForDesc(c[0]), c[1]);
                });
            });

            it("starts containers empty", function() {
                assert.deepEqual(JSON.parse(JSON.stringify(SisUtil.getNewItemForDesc({ type: "Document" }))), {});
                assert.deepEqual(JSON.parse(JSON.stringify(SisUtil.getNewItemForDesc({ type: "Array" }))), []);
            });
        });

        it("turns /regex/flags strings into regular expressions", function() {
            var re = SisUtil.toRegex("/^ab+$/i");
            assert.equal(re.test("ABB"), true);
            assert.equal(re.test("ac"), false);
            assert.equal(SisUtil.toRegex("plain"), null);
            assert.equal(SisUtil.toRegex("/[/"), null);
        });

        it("splits comma separated text", function() {
            assert.deepEqual(Array.from(SisUtil.toStringArray(" a, b,,c ")), ["a", "b", "c"]);
            // an array from the page's realm is returned as is
            var arr = new app.window.Array("x");
            assert.equal(SisUtil.toStringArray(arr), arr);
        });

        describe("permissions", function() {
            var schema = { name: "s", _sis: { owner: ["ops", "dba"] } };

            it("lets nobody manage anything when logged out", function() {
                assert.equal(SisUtil.getAdminRoles(), null);
                assert.equal(SisUtil.canManageEntity({}, schema), false);
                assert.equal(SisUtil.canAddEntity(schema), false);
            });

            it("lets super users do everything", function() {
                loginAs({ username: "root", super_user: true });
                assert.equal(SisUtil.getAdminRoles(), true);
                assert.equal(SisUtil.canManageEntity({}, schema), true);
                assert.equal(SisUtil.canManageSchema(schema), true);
            });

            it("needs a role in every owner group to manage an entity", function() {
                loginAs({ username: "u", roles: { ops: "user" } });
                assert.ok(!SisUtil.canManageEntity({}, schema));
                assert.equal(SisUtil.canManageEntity({ _sis: { owner: ["ops"] } }, schema), true);
                assert.equal(SisUtil.canManageEntity({ _sis: { owner: ["ops", "dba"], any_owner_can_modify: true } }, schema), true);
            });

            it("lets members of an owner group add entities", function() {
                loginAs({ username: "u", roles: { dba: "user" } });
                assert.equal(SisUtil.canAddEntity(schema), true);
                assert.equal(SisUtil.canAddEntity({ _sis: { owner: ["other"] } }), false);
                assert.equal(SisUtil.canAddEntity({ is_open: true, _sis: { owner: ["other"] } }), true);
            });

            it("lists the groups a user administers", function() {
                loginAs({ username: "u", roles: { ops: "admin", dev: "user", qa: "admin" } });
                assert.deepEqual(Array.from(SisUtil.getAdminRoles()), ["ops", "qa"]);
            });
        });
    });

    describe("SisSession", function() {
        it("caches schemas until they expire", function() {
            var SisSession = injector.get("SisSession");
            var schemas = [{ name: "a" }];
            SisSession.setSchemas(schemas, 60000);
            assert.equal(SisSession.getSchemas(), schemas);
            SisSession.setSchemas(schemas, -1);
            assert.equal(SisSession.getSchemas(), null);
        });

        it("forgets the current schema when the schema list changes", function() {
            var SisSession = injector.get("SisSession");
            SisSession.setCurrentSchema({ name: "a" });
            SisSession.setSchemas([{ name: "a" }]);
            assert.ok(!SisSession.getCurrentSchema());
        });
    });

    describe("filters", function() {
        var $filter;
        beforeEach(function() {
            $filter = injector.get("$filter");
        });

        it("expireTime shows time left in words", function() {
            var expireTime = $filter("expireTime");
            assert.equal(expireTime(0), "Expired.");
            assert.equal(expireTime("nope"), "Expired.");
            assert.equal(expireTime(60 * 60 * 1000), "in an hour");
            assert.equal(expireTime(8 * 60 * 60 * 1000), "in 8 hours");
        });

        it("labelWidth sizes labels to the longest name, at least 40px", function() {
            var labelWidth = $filter("labelWidth");
            assert.equal(labelWidth(2), "40px");
            assert.equal(labelWidth(10), "90px");
        });
    });

    describe("sisEntityInput", function() {
        // compiles an input for a field inside a form and returns its controls
        function compile(descriptor) {
            var $compile = injector.get("$compile");
            var scope = $rootScope.$new();
            scope.desc = descriptor;
            scope.model = {};
            scope.changed = function() {};
            var form = $compile(
                "<form name=\"f\"><sis-entity-input path=\"field\" field-descriptor=\"desc\" " +
                "ng-model=\"model.value\" value-changed=\"changed\" action=\"'add'\"></sis-entity-input></form>"
            )(scope);
            scope.$digest();
            var input = form.find("input, select");
            return {
                scope: scope,
                input: input,
                field: scope.f.field,
                type: function(text) {
                    input.val(text).triggerHandler("change");
                    scope.$digest();
                }
            };
        }

        it("validates IPv4 and IPv6 addresses", function() {
            var c = compile({ name: "ip", type: "IpAddress" });
            ["10.0.0.1", "10.0.0.0/8", "2001:db8::1", "::1", ""].forEach(function(ok) {
                c.type(ok);
                assert.equal(c.field.$valid, true, ok);
            });
            ["10.0.0.999", "nope", "2001:db8::zz"].forEach(function(bad) {
                c.type(bad);
                assert.equal(c.field.$error.ip, true, bad);
                assert.equal(c.scope.model.value, undefined, bad);
            });
        });

        it("applies a schema's match regex", function() {
            var c = compile({ name: "code", type: "String", match: "/^[a-z]+$/" });
            c.type("abc");
            assert.equal(c.field.$valid, true);
            assert.equal(c.scope.model.value, "abc");
            c.type("ABC");
            assert.equal(c.field.$error.match, true);
        });

        it("renders enums as a select and booleans as a checkbox", function() {
            assert.equal(compile({ name: "e", type: "String", enum: ["x", "y"] }).input.prop("tagName"), "SELECT");
            assert.equal(compile({ name: "b", type: "Boolean" }).input.attr("type"), "checkbox");
            assert.equal(compile({ name: "n", type: "Number", min: 1 }).input.attr("min"), "1");
        });

        it("marks required fields", function() {
            var c = compile({ name: "r", type: "String", required: true });
            assert.equal(c.field.$error.required, true);
            c.type("x");
            assert.equal(c.field.$valid, true);
        });
    });
});

"use strict";

// SisUser: login state kept in localStorage and checked against the API.

var assert = require("node:assert/strict");
var { loadApp, fakeJwt } = require("./helpers/app");

var HOUR = 60 * 60 * 1000;

describe("SisUser", function() {
    var app, injector, SisUser, $rootScope, api, calls, localStorage;

    before(async function() {
        app = await loadApp();
        localStorage = app.window.localStorage;
    });

    after(function() {
        app.close();
    });

    // A fake SisApi. Each test sets api.responses.<name> to a function returning
    // the value to resolve with, or throwing { status } to reject.
    beforeEach(function() {
        calls = [];
        api = { authToken: null, responses: {} };
        injector = app.injector(function($provide) {
            $provide.factory("SisApi", function($q) {
                var respond = function(name, args) {
                    calls.push([name].concat(args));
                    var fn = api.responses[name];
                    if (!fn) {
                        return $q.reject({ status: 500, error: "no fake for " + name });
                    }
                    try {
                        return $q.when(fn.apply(null, args));
                    } catch (err) {
                        return $q.reject(err);
                    }
                };
                return {
                    setAuthToken: function(t) { api.authToken = t; },
                    getAuthToken: function() { return api.authToken; },
                    authenticate: function(u, p) { return respond("authenticate", [u, p]); },
                    endSession: function(t) { return respond("endSession", [t]); },
                    users: { get: function(u) { return respond("users.get", [u]); } },
                    tokens: function(u) {
                        return {
                            list: function(q) { return respond("tokens.list", [u, q]); },
                            get: function(t) { return respond("tokens.get", [u, t]); }
                        };
                    }
                };
            });
        });
        SisUser = injector.get("SisUser");
        $rootScope = injector.get("$rootScope");
        api.responses["users.get"] = function(u) { return { name: u, super_user: false, roles: { ops: "admin" } }; };
    });

    // runs $q callbacks and returns what the promise settled with
    function settle(promise) {
        var result = {};
        promise.then(function(v) { result.value = v; }, function(e) { result.error = e; });
        $rootScope.$digest();
        return result;
    }

    function stored() {
        return JSON.parse(localStorage.getItem("t"));
    }

    function store(user) {
        localStorage.setItem("t", JSON.stringify(user));
    }

    function events() {
        var seen = [];
        $rootScope.$on("loggedIn", function(e, value) { seen.push(value); });
        return seen;
    }

    describe("verify", function() {
        it("resolves null when nobody is logged in", function() {
            assert.deepEqual(settle(SisUser.verify()), { value: null });
            assert.deepEqual(calls, []);
        });

        it("checks a session token with an authenticated request and uses its expiration", function() {
            var exp = Math.floor(Date.now() / 1000) + 3600;
            var token = fakeJwt({ sub: "ann", exp: exp });
            store({ username: "ann", token: token, expirationTime: Date.now() + 1000 });
            api.responses["tokens.list"] = function() { return []; };
            var seen = events();

            var result = settle(SisUser.verify());

            assert.equal(result.value.username, "ann");
            assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ["tokens.list", "ann", { limit: 1 }]);
            assert.equal(stored().expirationTime, exp * 1000);
            assert.deepEqual(JSON.parse(JSON.stringify(stored().roles)), { ops: "admin" });
            assert.equal(api.authToken, token);
            assert.deepEqual(seen, [true]);
        });

        it("checks a persistent token by looking it up, and keeps the login for 8 hours", function() {
            store({ username: "bob", token: "0123abcd", expirationTime: Date.now() + 1000 });
            api.responses["tokens.get"] = function(u, t) { return { name: t, username: u }; };

            settle(SisUser.verify());

            assert.deepEqual(calls[0], ["tokens.get", "bob", "0123abcd"]);
            var remaining = stored().expirationTime - Date.now();
            assert.ok(remaining > 8 * HOUR - 5000 && remaining <= 8 * HOUR, String(remaining));
        });

        [401, 404].forEach(function(status) {
            it("logs out when the API rejects the token (" + status + ")", function() {
                store({ username: "ann", token: fakeJwt({ exp: 9999999999 }), expirationTime: Date.now() + HOUR });
                api.responses["tokens.list"] = function() { throw { status: status }; };
                var seen = events();

                assert.deepEqual(settle(SisUser.verify()), { value: null });
                assert.equal(localStorage.getItem("t"), null);
                assert.equal(api.authToken, null);
                assert.deepEqual(seen, [false]);
                // the token is already invalid; no point ending the session
                assert.equal(calls.filter(function(c) { return c[0] === "endSession"; }).length, 0);
            });
        });

        it("keeps the login when the API is unavailable", function() {
            var user = { username: "ann", token: fakeJwt({ exp: 9999999999 }), expirationTime: Date.now() + HOUR };
            store(user);
            api.responses["tokens.list"] = function() { throw { status: 502 }; };

            assert.equal(settle(SisUser.verify()).value.username, "ann");
            assert.deepEqual(stored(), user);
        });
    });

    describe("isLoggedIn", function() {
        it("is false and clears an expired login", function() {
            store({ username: "ann", token: "x", expirationTime: Date.now() - 1 });
            assert.equal(SisUser.isLoggedIn(), false);
            assert.equal(localStorage.getItem("t"), null);
        });

        it("is true for a current login and sets the API token", function() {
            store({ username: "ann", token: "tok", expirationTime: Date.now() + HOUR });
            assert.equal(SisUser.isLoggedIn(), true);
            assert.equal(api.authToken, "tok");
        });
    });

    describe("login", function() {
        it("stores the user with the session token's expiration", function() {
            var exp = Math.floor(Date.now() / 1000) + 7200;
            var token = fakeJwt({ sub: "ann", exp: exp });
            api.responses.authenticate = function() { return { name: token, expires: 1 }; };
            var seen = events();

            var result = settle(SisUser.login("ann", "pw"));

            assert.deepEqual(calls[0], ["authenticate", "ann", "pw"]);
            assert.equal(result.value.token, token);
            assert.deepEqual(stored(), JSON.parse(JSON.stringify(result.value)));
            assert.equal(stored().expirationTime, exp * 1000);
            assert.equal(stored().super_user, false);
            assert.deepEqual(seen, [true]);
        });

        it("rejects and stores nothing when authentication fails", function() {
            api.responses.authenticate = function() { throw { status: 401, error: "Unauthorized" }; };

            var result = settle(SisUser.login("ann", "bad"));

            assert.match(result.error, /Unauthorized/);
            assert.equal(localStorage.getItem("t"), null);
        });
    });

    describe("logout", function() {
        it("ends a session token's session on the server", function() {
            var token = fakeJwt({ exp: 9999999999 });
            store({ username: "ann", token: token, expirationTime: Date.now() + HOUR });
            api.responses.endSession = function() { return {}; };

            assert.deepEqual(settle(SisUser.logout()), { value: true });
            assert.deepEqual(calls, [["endSession", token]]);
            assert.equal(localStorage.getItem("t"), null);
        });

        it("only forgets a persistent token, so the app that issued it can keep using it", function() {
            store({ username: "ann", token: "0123abcd", expirationTime: Date.now() + HOUR });

            assert.deepEqual(settle(SisUser.logout()), { value: true });
            assert.deepEqual(calls, []);
            assert.equal(localStorage.getItem("t"), null);
        });

        it("resolves false when the server could not end the session, but still logs out locally", function() {
            store({ username: "ann", token: fakeJwt({ exp: 9999999999 }), expirationTime: Date.now() + HOUR });
            api.responses.endSession = function() { throw { status: 500 }; };

            assert.deepEqual(settle(SisUser.logout()), { value: false });
            assert.equal(localStorage.getItem("t"), null);
        });

        it("does nothing when nobody is logged in", function() {
            assert.deepEqual(settle(SisUser.logout()), { value: true });
            assert.deepEqual(calls, []);
        });
    });

    describe("loginWithToken", function() {
        it("logs in with a valid session token", function() {
            var token = fakeJwt({ sub: "ann", exp: Math.floor(Date.now() / 1000) + 60 });
            api.responses["tokens.list"] = function() { return []; };

            var result = settle(SisUser.loginWithToken("ann", token));

            assert.equal(result.value.username, "ann");
            assert.equal(stored().token, token);
        });

        it("rejects an invalid token and clears the API token", function() {
            api.responses["tokens.get"] = function() { throw { status: 404 }; };

            var result = settle(SisUser.loginWithToken("ann", "deadbeef"));

            assert.equal(result.error.status, 404);
            assert.equal(api.authToken, null);
            assert.equal(localStorage.getItem("t"), null);
        });
    });

    it("tells session tokens from persistent tokens", function() {
        assert.equal(SisUser.isSessionToken(fakeJwt({})), true);
        assert.equal(SisUser.isSessionToken("0123456789abcdef0123456789abcdef"), false);
        assert.equal(SisUser.isSessionToken(null), false);
    });
});

"use strict";

// Minimal SIS REST client for arranging and checking test data over HTTP.
// Everything a test creates through it is deleted again by cleanup().

class SisApiError extends Error {
    constructor(method, path, status, body) {
        super(method + " " + path + " -> " + status + " " + JSON.stringify(body));
        this.status = status;
        this.body = body;
    }
}

// v1.1 objects need an owner group in _sis
function withOwner(obj) {
    return Object.assign({}, obj, { _sis: Object.assign({ owner: ["e2e"] }, obj._sis) });
}

class SisClient {
    constructor(apiUrl, token) {
        this.apiUrl = apiUrl;
        this.token = token;
        this.created = [];
    }

    static async login(apiUrl, username, password) {
        var res = await fetch(apiUrl + "/api/v1.1/users/auth_token", {
            method: "POST",
            headers: {
                Accept: "application/json",
                Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64")
            }
        });
        var body = await res.json();
        if (!res.ok) {
            throw new SisApiError("POST", "/users/auth_token", res.status, body);
        }
        return body;
    }

    async request(method, path, body) {
        var headers = { Accept: "application/json" };
        if (this.token) {
            headers["x-auth-token"] = this.token;
        }
        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
        }
        var res = await fetch(this.apiUrl + "/api/v1.1" + path, {
            method: method,
            headers: headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        var text = await res.text();
        var data = text ? JSON.parse(text) : null;
        if (!res.ok) {
            throw new SisApiError(method, path, res.status, data);
        }
        return data;
    }

    get(path) { return this.request("GET", path); }
    post(path, body) { return this.request("POST", path, body); }
    put(path, body) { return this.request("PUT", path, body); }
    del(path) { return this.request("DELETE", path); }

    // create and remember for cleanup
    async create(path, body, idField) {
        var obj = await this.post(path, body);
        this.created.push(path + "/" + encodeURIComponent(obj[idField || "name"]));
        return obj;
    }

    createSchema(schema) {
        return this.create("/schemas", withOwner(schema));
    }

    createEntity(schemaName, entity) {
        return this.create("/entities/" + schemaName, entity, "_id");
    }

    createHook(hook) {
        return this.create("/hooks", withOwner(hook));
    }

    createScript(script) {
        return this.create("/scripts", withOwner(script));
    }

    createUser(user) {
        return this.create("/users", Object.assign({ email: user.name + "@example.com" }, user));
    }

    createToken(username, token) {
        return this.post("/users/" + username + "/tokens", token || { desc: "e2e" });
    }

    // Deletes everything created, newest first. Objects the test already
    // deleted (404) are fine.
    async cleanup() {
        var paths = this.created.reverse();
        this.created = [];
        for (var i = 0; i < paths.length; ++i) {
            try {
                await this.del(paths[i]);
            } catch (err) {
                if (err.status !== 404) {
                    throw err;
                }
            }
        }
    }
}

module.exports = { SisClient: SisClient, SisApiError: SisApiError };

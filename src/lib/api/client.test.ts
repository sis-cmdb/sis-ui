import { beforeEach, describe, expect, it } from "vitest";
import { SisApiError, SisClient } from "./client";

interface Sent {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
}

// A fetch that records requests and answers from a queue of responses.
function fakeFetch() {
    const sent: Sent[] = [];
    const responses: Array<Response | Error> = [];
    const fetch = async function(url: string | URL | Request, init?: RequestInit): Promise<Response> {
        sent.push({
            method: init?.method || "GET",
            url: String(url),
            headers: (init?.headers || {}) as Record<string, string>,
            body: init?.body ? JSON.parse(String(init.body)) : undefined
        });
        const next = responses.shift();
        if (!next) {
            throw new Error("no response queued");
        }
        if (next instanceof Error) {
            throw next;
        }
        return next;
    };
    function respond(status: number, body?: unknown, headers?: Record<string, string>) {
        const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
        responses.push(new Response(text, { status, headers }));
    }
    return { fetch: fetch as typeof globalThis.fetch, sent, respond, responses };
}

describe("SisClient", function() {
    let fake: ReturnType<typeof fakeFetch>;
    let client: SisClient;

    beforeEach(function() {
        fake = fakeFetch();
        client = new SisClient({ baseUrl: "https://api.example.com/", fetch: fake.fetch });
    });

    it("lists a page with the total count, sending objects in the query as JSON", async function() {
        fake.respond(200, [{ name: "a" }], { "x-total-count": "41" });

        const page = await client.schemas.list({ q: { name: { $regex: "^a" } }, limit: 20, offset: 0, sort: "name" });

        expect(page).toEqual({ results: [{ name: "a" }], totalCount: 41 });
        const url = new URL(fake.sent[0]!.url);
        expect(url.origin + url.pathname).toBe("https://api.example.com/api/v1.1/schemas");
        expect(url.searchParams.get("q")).toBe('{"name":{"$regex":"^a"}}');
        expect(url.searchParams.get("limit")).toBe("20");
        expect(url.searchParams.get("sort")).toBe("name");
    });

    it("counts the results when the API sends no total", async function() {
        fake.respond(200, [{ name: "a" }, { name: "b" }]);
        expect((await client.hooks.list()).totalCount).toBe(2);
    });

    it("lists everything a page of 200 at a time", async function() {
        const page = (start: number, n: number) => Array.from({ length: n }, (_, i) => ({ name: "s" + (start + i) }));
        fake.respond(200, page(0, 200));
        fake.respond(200, page(200, 200));
        fake.respond(200, page(400, 3));

        const all = await client.schemas.listAll({ sort: "name" });

        expect(all).toHaveLength(403);
        expect(fake.sent.map((s) => new URL(s.url).searchParams.get("offset"))).toEqual(["0", "200", "400"]);
        expect(new URL(fake.sent[2]!.url).searchParams.get("sort")).toBe("name");
    });

    it("gets, creates, updates and removes objects", async function() {
        fake.respond(200, { _id: "1" });
        fake.respond(201, { _id: "2" });
        fake.respond(200, { _id: "2" });
        fake.respond(200, { _id: "2" });
        const hosts = client.entities("my host");

        await hosts.get("1");
        await hosts.create({ name: "x" });
        await hosts.update("2", { name: "y" }, { forceMixed: true });
        await hosts.remove("2");

        expect(fake.sent.map((s) => [s.method, s.url, s.body])).toEqual([
            ["GET", "https://api.example.com/api/v1.1/entities/my%20host/1", undefined],
            ["POST", "https://api.example.com/api/v1.1/entities/my%20host", { name: "x" }],
            ["PUT", "https://api.example.com/api/v1.1/entities/my%20host/2?forceMixed=true", { name: "y" }],
            ["DELETE", "https://api.example.com/api/v1.1/entities/my%20host/2", undefined]
        ]);
        expect(fake.sent[1]!.headers["Content-Type"]).toBe("application/json");
        expect(fake.sent[0]!.headers["Content-Type"]).toBeUndefined();
    });

    it("lists the commits of an object and the tokens of a user", async function() {
        fake.respond(200, []);
        fake.respond(200, []);
        await client.scripts.commits("hello").list();
        await client.tokens("ann").list({ limit: 1 });
        expect(fake.sent[0]!.url).toBe("https://api.example.com/api/v1.1/scripts/hello/commits");
        expect(fake.sent[1]!.url).toBe("https://api.example.com/api/v1.1/users/ann/tokens?limit=1");
    });

    it("refuses an empty id instead of requesting the whole list", function() {
        expect(() => client.hooks.get("")).toThrow(TypeError);
    });

    it("authenticates with basic auth (UTF-8) and sends the session token afterwards", async function() {
        fake.respond(201, { name: "jwt.token.here", expires: 1000 });
        fake.respond(200, { name: "ann" });

        const token = await client.authenticate("ann", "pässwörd");
        await client.users.get("ann");

        expect(token.name).toBe("jwt.token.here");
        expect(fake.sent[0]!.method).toBe("POST");
        expect(fake.sent[0]!.url).toBe("https://api.example.com/api/v1.1/users/auth_token");
        const decoded = new TextDecoder().decode(Uint8Array.from(atob(fake.sent[0]!.headers.Authorization!.slice(6)), (c) => c.charCodeAt(0)));
        expect(decoded).toBe("ann:pässwörd");
        expect(fake.sent[0]!.headers["x-auth-token"]).toBeUndefined();
        expect(fake.sent[1]!.headers["x-auth-token"]).toBe("jwt.token.here");
        expect(client.getAuthToken()).toBe("jwt.token.here");
    });

    it("forgets the old token when authentication fails", async function() {
        client.setAuthToken("old");
        fake.respond(401, { error: "Unauthorized", code: 1007 });
        await expect(client.authenticate("ann", "bad")).rejects.toMatchObject({ status: 401 });
        expect(client.getAuthToken()).toBeNull();
    });

    it("ends a session with the given token", async function() {
        client.setAuthToken("current");
        fake.respond(200, {});
        await client.endSession("other");
        expect(fake.sent[0]!.method).toBe("DELETE");
        expect(fake.sent[0]!.url).toBe("https://api.example.com/api/v1.1/users/auth_token");
        expect(fake.sent[0]!.headers["x-auth-token"]).toBe("other");
    });

    describe("errors", function() {
        it("carry the API's message, code and status", async function() {
            fake.respond(400, { error: "Bad request: owner field is required in _sis", code: 1001 });
            const err = await client.hooks.create({}).catch((e: unknown) => e);
            expect(err).toBeInstanceOf(SisApiError);
            expect(err).toMatchObject({ status: 400, code: 1001, message: "Bad request: owner field is required in _sis" });
        });

        it("use the body when it is not JSON, and the status without a body", async function() {
            fake.respond(502, "Bad Gateway");
            fake.respond(500);
            await expect(client.info()).rejects.toMatchObject({ status: 502, message: "Bad Gateway" });
            await expect(client.info()).rejects.toMatchObject({ status: 500, message: "The SIS API answered 500" });
        });

        it("have status 0 when the API cannot be reached", async function() {
            fake.responses.push(new TypeError("Failed to fetch"));
            await expect(client.info()).rejects.toMatchObject({ status: 0, message: "The SIS API could not be reached: Failed to fetch" });
        });
    });
});

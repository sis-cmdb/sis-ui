import { beforeEach, describe, expect, it } from "vitest";
import type { Token, User } from "./api/types";
import { isSessionToken, Session, sessionExpiration, STORAGE_KEY, type LoggedInUser, type SessionApi } from "./session";

const HOUR = 60 * 60 * 1000;

function fakeJwt(claims: object): string {
    const enc = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return enc({ alg: "EdDSA", typ: "JWT" }) + "." + enc(claims) + ".c2ln";
}

function memoryStorage() {
    const items = new Map<string, string>();
    return {
        getItem: (k: string) => items.get(k) ?? null,
        setItem: (k: string, v: string) => void items.set(k, v),
        removeItem: (k: string) => void items.delete(k)
    };
}

// A fake API. Each test sets responses[name] to a function returning the value
// to resolve with, or throwing { status } to reject.
function fakeApi() {
    const calls: unknown[][] = [];
    const responses: Record<string, (...args: never[]) => unknown> = {};
    let authToken: string | null = null;
    async function respond<T>(name: string, ...args: unknown[]): Promise<T> {
        calls.push([name, ...args]);
        const fn = responses[name] as ((...a: unknown[]) => unknown) | undefined;
        if (!fn) {
            throw { status: 500, error: "no fake for " + name };
        }
        return fn(...args) as T;
    }
    const api: SessionApi = {
        setAuthToken: (t) => { authToken = t; },
        getAuthToken: () => authToken,
        authenticate: (u, p) => respond<Token>("authenticate", u, p),
        endSession: (t) => respond<void>("endSession", t),
        users: { get: (u) => respond<User>("users.get", u) },
        tokens: (u) => ({
            list: (q) => respond("tokens.list", u, q),
            get: (t) => respond<Token>("tokens.get", u, t)
        })
    };
    return { api, calls, responses, token: () => authToken };
}

describe("Session", function() {
    let fake: ReturnType<typeof fakeApi>;
    let storage: ReturnType<typeof memoryStorage>;
    let session: Session;
    let changes: boolean[];

    beforeEach(function() {
        fake = fakeApi();
        storage = memoryStorage();
        session = new Session(fake.api, storage);
        changes = [];
        session.onChange((loggedIn) => changes.push(loggedIn));
        fake.responses["users.get"] = (u: string) => ({ name: u, super_user: false, roles: { ops: "admin" } });
    });

    function stored(): LoggedInUser | null {
        const text = storage.getItem(STORAGE_KEY);
        return text ? JSON.parse(text) : null;
    }

    function store(user: Partial<LoggedInUser>) {
        storage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    describe("verify", function() {
        it("resolves null when nobody is logged in", async function() {
            expect(await session.verify()).toBeNull();
            expect(fake.calls).toEqual([]);
        });

        it("checks a session token with an authenticated request and uses its expiration", async function() {
            const exp = Math.floor(Date.now() / 1000) + 3600;
            const token = fakeJwt({ sub: "ann", exp });
            store({ username: "ann", token, expirationTime: Date.now() + 1000 });
            fake.responses["tokens.list"] = () => [];

            const user = await session.verify();

            expect(user?.username).toBe("ann");
            expect(fake.calls[0]).toEqual(["tokens.list", "ann", { limit: 1 }]);
            expect(stored()?.expirationTime).toBe(exp * 1000);
            expect(stored()?.roles).toEqual({ ops: "admin" });
            expect(fake.token()).toBe(token);
            expect(changes).toEqual([true]);
        });

        it("checks a persistent token by looking it up, and keeps the login for 8 hours", async function() {
            store({ username: "bob", token: "0123abcd", expirationTime: Date.now() + 1000 });
            fake.responses["tokens.get"] = (u: string, t: string) => ({ name: t, username: u });

            await session.verify();

            expect(fake.calls[0]).toEqual(["tokens.get", "bob", "0123abcd"]);
            const remaining = stored()!.expirationTime - Date.now();
            expect(remaining).toBeGreaterThan(8 * HOUR - 5000);
            expect(remaining).toBeLessThanOrEqual(8 * HOUR);
        });

        it.each([401, 404])("logs out when the API rejects the token (%i)", async function(status) {
            store({ username: "ann", token: fakeJwt({ exp: 9999999999 }), expirationTime: Date.now() + HOUR });
            fake.responses["tokens.list"] = () => { throw { status }; };

            expect(await session.verify()).toBeNull();
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
            expect(fake.token()).toBeNull();
            expect(changes).toEqual([false]);
            // the token is already invalid; no point ending the session
            expect(fake.calls.filter((c) => c[0] === "endSession")).toEqual([]);
        });

        it("keeps the login when the API is unavailable", async function() {
            const user = { username: "ann", token: fakeJwt({ exp: 9999999999 }), expirationTime: Date.now() + HOUR };
            store(user);
            fake.responses["tokens.list"] = () => { throw { status: 0 }; };

            expect((await session.verify())?.username).toBe("ann");
            expect(stored()).toEqual(user);
        });
    });

    describe("isLoggedIn", function() {
        it("is false and clears an expired login", function() {
            store({ username: "ann", token: "x", expirationTime: Date.now() - 1 });
            expect(session.isLoggedIn()).toBe(false);
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
        });

        it("is true for a current login and sets the API token", function() {
            store({ username: "ann", token: "tok", expirationTime: Date.now() + HOUR });
            expect(session.isLoggedIn()).toBe(true);
            expect(fake.token()).toBe("tok");
        });

        it("is false and clears an unreadable login", function() {
            storage.setItem(STORAGE_KEY, "{not json");
            expect(session.isLoggedIn()).toBe(false);
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
        });
    });

    describe("login", function() {
        it("stores the user with the session token's expiration", async function() {
            const exp = Math.floor(Date.now() / 1000) + 7200;
            const token = fakeJwt({ sub: "ann", exp });
            fake.responses.authenticate = () => ({ name: token, expires: 1 });

            const user = await session.login("ann", "pw");

            expect(fake.calls[0]).toEqual(["authenticate", "ann", "pw"]);
            expect(user.token).toBe(token);
            expect(stored()).toEqual(user);
            expect(user.expirationTime).toBe(exp * 1000);
            expect(user.super_user).toBe(false);
            expect(changes).toEqual([true]);
        });

        it("uses the token's expires when it is not a JWT", async function() {
            fake.responses.authenticate = () => ({ name: "opaque", expires: HOUR });
            const user = await session.login("ann", "pw");
            expect(user.expirationTime - Date.now()).toBeGreaterThan(HOUR - 5000);
        });

        it("rejects with the API's error and stores nothing when authentication fails", async function() {
            fake.responses.authenticate = () => { throw { status: 401, error: "Unauthorized" }; };

            await expect(session.login("ann", "bad")).rejects.toMatchObject({ status: 401 });
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
        });
    });

    describe("logout", function() {
        it("ends a session token's session on the server", async function() {
            const token = fakeJwt({ exp: 9999999999 });
            store({ username: "ann", token, expirationTime: Date.now() + HOUR });
            fake.responses.endSession = () => ({});

            expect(await session.logout()).toBe(true);
            expect(fake.calls).toEqual([["endSession", token]]);
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
            expect(changes).toEqual([false]);
        });

        it("only forgets a persistent token, so the app that issued it can keep using it", async function() {
            store({ username: "ann", token: "0123abcd", expirationTime: Date.now() + HOUR });

            expect(await session.logout()).toBe(true);
            expect(fake.calls).toEqual([]);
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
        });

        it("resolves false when the server could not end the session, but still logs out locally", async function() {
            store({ username: "ann", token: fakeJwt({ exp: 9999999999 }), expirationTime: Date.now() + HOUR });
            fake.responses.endSession = () => { throw { status: 500 }; };

            expect(await session.logout()).toBe(false);
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
        });

        it("does nothing when nobody is logged in", async function() {
            expect(await session.logout()).toBe(true);
            expect(fake.calls).toEqual([]);
            expect(changes).toEqual([]);
        });
    });

    describe("loginWithToken", function() {
        it("logs in with a valid session token", async function() {
            const token = fakeJwt({ sub: "ann", exp: Math.floor(Date.now() / 1000) + 60 });
            fake.responses["tokens.list"] = () => [];

            const user = await session.loginWithToken("ann", token);

            expect(user.username).toBe("ann");
            expect(stored()?.token).toBe(token);
        });

        it("rejects an invalid token and clears the API token", async function() {
            fake.responses["tokens.get"] = () => { throw { status: 404 }; };

            await expect(session.loginWithToken("ann", "deadbeef")).rejects.toMatchObject({ status: 404 });
            expect(fake.token()).toBeNull();
            expect(storage.getItem(STORAGE_KEY)).toBeNull();
        });
    });

    it("stops calling a listener once it is removed", async function() {
        const seen: boolean[] = [];
        const remove = session.onChange((v) => seen.push(v));
        remove();
        store({ username: "ann", token: "x", expirationTime: Date.now() - 1 });
        session.isLoggedIn();
        expect(seen).toEqual([]);
        expect(changes).toEqual([false]);
    });
});

describe("tokens", function() {
    it("tells session tokens from persistent tokens", function() {
        expect(isSessionToken(fakeJwt({}))).toBe(true);
        expect(isSessionToken("0123456789abcdef0123456789abcdef")).toBe(false);
        expect(isSessionToken(null)).toBe(false);
    });

    it("reads a session token's expiration", function() {
        expect(sessionExpiration(fakeJwt({ exp: 1700000000 }))).toBe(1700000000 * 1000);
        expect(sessionExpiration(fakeJwt({}))).toBeNull();
        expect(sessionExpiration("not.a.jwt")).toBeNull();
    });
});

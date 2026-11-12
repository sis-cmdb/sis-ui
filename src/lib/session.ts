// The login, kept in localStorage and checked against the API (port of the
// AngularJS SisUser). Uses the same storage key and format, so a login made in
// the AngularJS UI carries over.
//
// Session tokens (from POST /users/auth_token) are JWTs: the API does not store
// them, they are checked with an authenticated request and expire as the token
// says. Persistent tokens are opaque strings looked up via /users/<name>/tokens,
// and they are never revoked on logout: they belong to whoever issued them (e.g.
// an app embedding the UI).

import type { ListQuery } from "./api/client";
import type { Role, Token, User } from "./api/types";

export const STORAGE_KEY = "t";

// how long a login with a persistent (non expiring) token lasts
export const PERSISTENT_TOKEN_SESSION_MS = 8 * 60 * 60 * 1000;

export interface LoggedInUser {
    username: string;
    super_user?: boolean;
    roles?: Record<string, Role>;
    // ms since the epoch
    expirationTime: number;
    token: string;
}

// what the session needs from the API client (SisClient)
export interface SessionApi {
    setAuthToken(token: string | null): void;
    getAuthToken(): string | null;
    authenticate(username: string, password: string): Promise<Token>;
    endSession(token: string): Promise<void>;
    users: { get(name: string): Promise<User> };
    tokens(username: string): { list(query: ListQuery): Promise<unknown>; get(name: string): Promise<Token> };
}

export type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isSessionToken(token: unknown): token is string {
    return typeof token === "string" && token.split(".").length === 3;
}

// expiration of a session token in ms since the epoch, or null
export function sessionExpiration(token: string): number | null {
    try {
        let payload = token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
        while (payload.length % 4) {
            payload += "=";
        }
        const claims = JSON.parse(atob(payload)) as { exp?: unknown };
        return typeof claims.exp === "number" ? claims.exp * 1000 : null;
    } catch {
        return null;
    }
}

// the API rejected the token itself (as opposed to being unreachable)
function isInvalidTokenError(err: unknown): boolean {
    const status = (err as { status?: unknown } | null)?.status;
    return status === 401 || status === 404;
}

export class Session {
    private readonly listeners = new Set<(loggedIn: boolean) => void>();

    constructor(
        private readonly api: SessionApi,
        private readonly storage: SessionStorage,
        private readonly now: () => number = Date.now
    ) {}

    // called with true on every login (and successful verify), false on logout;
    // returns a function that removes the listener
    onChange(listener: (loggedIn: boolean) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    isLoggedIn(): boolean {
        const user = this.currentUser();
        if (user) {
            // ensure the API client sends the token
            this.api.setAuthToken(user.token);
        }
        return !!user;
    }

    // the logged in user, or null (an expired login is cleared)
    currentUser(): LoggedInUser | null {
        const user = this.read();
        if (user && !(user.expirationTime > this.now())) {
            this.clear();
            return null;
        }
        return user;
    }

    // Logs out locally and, for session tokens, on the server. Resolves false if
    // the API could not end the session.
    async logout(): Promise<boolean> {
        if (!this.isLoggedIn()) {
            return true;
        }
        const token = this.api.getAuthToken();
        this.clear();
        if (!isSessionToken(token)) {
            return true;
        }
        try {
            await this.api.endSession(token);
            return true;
        } catch {
            return false;
        }
    }

    // Rejects with the API's error (status 401 for a wrong password).
    async login(username: string, password: string): Promise<LoggedInUser> {
        await this.logout();
        const token = await this.api.authenticate(username, password);
        const expirationTime = sessionExpiration(token.name) ?? this.now() + (token.expires ?? PERSISTENT_TOKEN_SESSION_MS);
        return this.store(username, token.name, expirationTime);
    }

    // Checks the stored login with the API. Resolves with the user, or null if
    // nobody is logged in or the API rejected the token. When the API cannot be
    // reached the login is kept, to be checked again next time.
    async verify(): Promise<LoggedInUser | null> {
        const user = this.currentUser();
        if (!user) {
            return null;
        }
        try {
            const expirationTime = await this.checkToken(user.username, user.token);
            return await this.store(user.username, user.token, expirationTime);
        } catch (err) {
            if (isInvalidTokenError(err)) {
                this.clear();
                return null;
            }
            return user;
        }
    }

    // Logs in with a token, e.g. from ?username=&token= in the url.
    async loginWithToken(username: string, token: string): Promise<LoggedInUser> {
        await this.logout();
        try {
            const expirationTime = await this.checkToken(username, token);
            return await this.store(username, token, expirationTime);
        } catch (err) {
            this.api.setAuthToken(null);
            throw err;
        }
    }

    // Checks a token with the API and resolves with its expiration time.
    private async checkToken(username: string, token: string): Promise<number> {
        this.api.setAuthToken(token);
        const tokens = this.api.tokens(username);
        if (isSessionToken(token)) {
            await tokens.list({ limit: 1 });
            return sessionExpiration(token) ?? this.now() + PERSISTENT_TOKEN_SESSION_MS;
        }
        const result = await tokens.get(token);
        return this.now() + (result.expires || PERSISTENT_TOKEN_SESSION_MS);
    }

    private async store(username: string, token: string, expirationTime: number): Promise<LoggedInUser> {
        const user = await this.api.users.get(username);
        const data: LoggedInUser = {
            username: user.name,
            super_user: user.super_user,
            roles: user.roles,
            expirationTime,
            token
        };
        this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
        this.emit(true);
        return data;
    }

    private read(): LoggedInUser | null {
        const text = this.storage.getItem(STORAGE_KEY);
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text) as LoggedInUser;
        } catch {
            // unreadable; treat as logged out
            this.storage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    private clear(): void {
        this.api.setAuthToken(null);
        this.storage.removeItem(STORAGE_KEY);
        this.emit(false);
    }

    private emit(loggedIn: boolean): void {
        for (const listener of this.listeners) {
            listener(loggedIn);
        }
    }
}

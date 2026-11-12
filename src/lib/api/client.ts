// A typed client for the SIS API (v1.1) on top of fetch. Replaces the `sis`
// npm package used by the AngularJS UI.

import type { BuildInfo, Commit, Entity, Hook, Schema, Script, Token, User } from "./types";

// An error response (or no response) from the API. status is 0 when the API
// could not be reached.
export class SisApiError extends Error {
    readonly status: number;
    // the API's error code, e.g. 1001 for a bad request
    readonly code: number | undefined;

    constructor(status: number, message: string, code?: number) {
        super(message);
        this.name = "SisApiError";
        this.status = status;
        this.code = code;
    }
}

// Query string parameters. Objects (e.g. a query) are sent as JSON.
export type Params = Record<string, unknown>;

export interface ListQuery extends Params {
    // a SIS query, e.g. { name: { $regex: "^web" } }
    q?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    sort?: string;
    fields?: string;
}

export interface ListResult<T> {
    results: T[];
    // the number of objects matching the query, across all pages
    totalCount: number;
}

interface RequestOptions {
    params?: Params | undefined;
    body?: unknown;
    // overrides the client's token
    token?: string;
    basicAuth?: { username: string; password: string };
}

const LIST_ALL_PAGE_SIZE = 200;

function queryString(params: Params | undefined): string {
    if (!params) {
        return "";
    }
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
            continue;
        }
        const text = typeof value === "object" ? JSON.stringify(value) : String(value);
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(text));
    }
    return parts.length ? "?" + parts.join("&") : "";
}

// base64 of UTF-8 text (btoa alone only takes Latin-1)
function base64(text: string): string {
    let binary = "";
    for (const byte of new TextEncoder().encode(text)) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

export interface ClientOptions {
    // base url of the API, without /api/<version>
    baseUrl: string;
    version?: string;
    fetch?: typeof fetch;
}

export class SisClient {
    readonly schemas: Endpoint<Schema>;
    readonly hooks: Endpoint<Hook>;
    readonly scripts: Endpoint<Script>;
    readonly users: Endpoint<User>;
    readonly hiera: Endpoint<Record<string, unknown>>;

    private readonly apiBase: string;
    private readonly fetchFn: typeof fetch;
    private authToken: string | null = null;

    constructor(options: ClientOptions) {
        this.apiBase = options.baseUrl.replace(/\/+$/, "") + "/api/" + (options.version || "v1.1");
        // unbound, window.fetch throws "Illegal invocation"
        this.fetchFn = options.fetch || globalThis.fetch.bind(globalThis);
        this.schemas = new Endpoint(this, "/schemas");
        this.hooks = new Endpoint(this, "/hooks");
        this.scripts = new Endpoint(this, "/scripts");
        this.users = new Endpoint(this, "/users");
        this.hiera = new Endpoint(this, "/hiera");
    }

    setAuthToken(token: string | null): void {
        this.authToken = token;
    }

    getAuthToken(): string | null {
        return this.authToken;
    }

    entities(schemaName: string): Endpoint<Entity> {
        return new Endpoint(this, "/entities/" + encodeURIComponent(schemaName));
    }

    // the tokens of a user
    tokens(username: string): Endpoint<Token> {
        return new Endpoint(this, "/users/" + encodeURIComponent(username) + "/tokens");
    }

    // Logs in and uses the new session token from then on.
    async authenticate(username: string, password: string): Promise<Token> {
        this.authToken = null;
        const token = await this.request<Token>("POST", "/users/auth_token", { basicAuth: { username, password } });
        this.authToken = token.name;
        return token;
    }

    // Logs out: ends every session of the user the session token belongs to.
    async endSession(token: string): Promise<void> {
        await this.request("DELETE", "/users/auth_token", { token });
    }

    info(): Promise<BuildInfo> {
        return this.request<BuildInfo>("GET", "/info");
    }

    async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
        return (await this.send<T>(method, path, options)).body;
    }

    // the response body and headers; for list requests
    async send<T>(method: string, path: string, options: RequestOptions = {}): Promise<{ body: T; headers: Headers }> {
        const headers: Record<string, string> = { Accept: "application/json" };
        const token = options.token ?? this.authToken;
        if (token) {
            headers["x-auth-token"] = token;
        }
        if (options.basicAuth) {
            headers.Authorization = "Basic " + base64(options.basicAuth.username + ":" + options.basicAuth.password);
        }
        let body: string | undefined;
        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(options.body);
        }

        let response: Response;
        try {
            response = await this.fetchFn(this.apiBase + path + queryString(options.params), { method, headers, body });
        } catch (err) {
            throw new SisApiError(0, "The SIS API could not be reached: " + (err instanceof Error ? err.message : String(err)));
        }
        const text = await response.text();
        let data: unknown = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }
        if (!response.ok) {
            const error = data as { error?: unknown; code?: unknown } | string | null;
            const message = typeof error === "object" && error && error.error !== undefined ? String(error.error)
                : typeof error === "string" && error ? error
                : "The SIS API answered " + [response.status, response.statusText].filter(Boolean).join(" ");
            const code = typeof error === "object" && error && typeof error.code === "number" ? error.code : undefined;
            throw new SisApiError(response.status, message, code);
        }
        return { body: data as T, headers: response.headers };
    }
}

// The objects of one kind (/schemas, /entities/<name>, ...)
export class Endpoint<T> {
    constructor(protected readonly client: SisClient, protected readonly path: string) {}

    // one page of objects
    async list(query: ListQuery = {}): Promise<ListResult<T>> {
        const { body, headers } = await this.client.send<T[]>("GET", this.path, { params: query });
        const total = parseInt(headers.get("x-total-count") || "", 10);
        return { results: body, totalCount: isNaN(total) ? body.length : total };
    }

    // every object matching the query, fetched a page at a time
    async listAll(query: ListQuery = {}): Promise<T[]> {
        const result: T[] = [];
        for (;;) {
            const page = await this.list({ ...query, limit: LIST_ALL_PAGE_SIZE, offset: result.length });
            result.push(...page.results);
            if (page.results.length < LIST_ALL_PAGE_SIZE) {
                return result;
            }
        }
    }

    get(id: string): Promise<T> {
        return this.client.request<T>("GET", this.itemPath(id));
    }

    create(obj: Partial<T>, params?: Params): Promise<T> {
        return this.client.request<T>("POST", this.path, { body: obj, params });
    }

    update(id: string, obj: Partial<T>, params?: Params): Promise<T> {
        return this.client.request<T>("PUT", this.itemPath(id), { body: obj, params });
    }

    remove(id: string): Promise<T> {
        return this.client.request<T>("DELETE", this.itemPath(id));
    }

    // the change history of an object
    commits(id: string): Endpoint<Commit> {
        return new Endpoint<Commit>(this.client, this.itemPath(id) + "/commits");
    }

    protected itemPath(id: string): string {
        if (!id) {
            throw new TypeError("An id is required");
        }
        return this.path + "/" + encodeURIComponent(id);
    }
}

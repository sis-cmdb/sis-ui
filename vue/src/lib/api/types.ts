// Objects of the SIS API (v1.1). Fields the UI does not use may be missing;
// see ../sis-api/docs.

export type Role = "user" | "admin";

// _sis: metadata of every SIS object
export interface SisMeta {
    owner?: string[];
    tags?: string[];
    locked?: boolean;
    immutable?: boolean;
    any_owner_can_modify?: boolean;
    _created_at?: number;
    _updated_at?: number;
    _created_by?: string;
    _updated_by?: string;
    _references?: string[];
    [key: string]: unknown;
}

// A field of a schema definition, in the forms the API accepts:
//   "String"                          a type name
//   { type: "Number", min: 1 }        a type with attributes
//   ["String"], { type: ["String"] }  an array of the given type
//   { rack: "String" }                an embedded document
export type FieldSpec = string | FieldSpec[] | { [key: string]: unknown };

export type SchemaDefinition = Record<string, FieldSpec>;

export interface Schema {
    name: string;
    description?: string;
    definition: SchemaDefinition;
    id_field?: string;
    is_open?: boolean;
    is_public?: boolean;
    any_owner_can_modify?: boolean;
    track_history?: boolean;
    locked_fields?: string[];
    // with GET /schemas?with_counts=true
    entity_count?: number;
    _id?: string;
    _sis: SisMeta;
}

export interface Entity {
    _id: string;
    _sis?: SisMeta;
    [field: string]: unknown;
}

export type HookEvent = "insert" | "update" | "delete";

export interface Hook {
    name: string;
    entity_type: string;
    events: HookEvent[];
    target: { url: string; action: "GET" | "POST" | "PUT" };
    retry_count?: number;
    retry_delay?: number;
    _sis: SisMeta;
}

export interface Script {
    name: string;
    description?: string;
    script_type: string;
    script: string;
    _sis: SisMeta;
}

export interface User {
    name: string;
    email?: string;
    super_user?: boolean;
    roles: Record<string, Role>;
    _sis?: SisMeta;
}

// A login session (a JWT, from POST /users/auth_token) or a persistent token
export interface Token {
    name: string;
    desc?: string;
    username?: string;
    // ms the token is valid for
    expires?: number;
    _sis?: SisMeta;
}

export type CommitAction = "insert" | "update" | "delete";

export interface Commit {
    _id: string;
    type: string;
    entity_id: string;
    action: CommitAction;
    modified_by: string;
    date_modified: number;
    // the object for insert/delete, a jsondiffpatch delta for update
    commit_data?: unknown;
    diff?: unknown;
}

// GET /info, and the UI's own build.json
export interface BuildInfo {
    version?: string;
    build_num?: string;
    git_hash?: string;
    build_id?: string;
}

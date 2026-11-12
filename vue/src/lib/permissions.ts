// What the logged in user may do (ports of the SisUtil permission checks and
// the rules in the AngularJS controllers). The API enforces the same rules;
// these only decide which buttons the UI offers. user is null when nobody is
// logged in.

import type { Schema, SisMeta, User } from "./api/types";
import type { LoggedInUser } from "./session";

type Owned = { _sis?: SisMeta };

function roles(user: LoggedInUser): Record<string, string> {
    return user.roles || {};
}

function hasRoles(user: LoggedInUser): boolean {
    return Object.keys(roles(user)).length > 0;
}

// the groups the user administers: true for super users, null when logged out
export function adminGroups(user: LoggedInUser | null): true | string[] | null {
    if (!user) {
        return null;
    }
    if (user.super_user) {
        return true;
    }
    return Object.entries(roles(user)).filter(([, role]) => role === "admin").map(([group]) => group);
}

// the groups the user belongs to: true for super users
export function allGroups(user: LoggedInUser | null): true | string[] {
    if (!user) {
        return [];
    }
    return user.super_user ? true : Object.keys(roles(user));
}

// the schema's owner groups the user may give new entities
export function ownerSubset(user: LoggedInUser | null, schema: Schema): string[] {
    const owner = schema._sis.owner || [];
    if (!user) {
        return [];
    }
    return user.super_user ? owner : owner.filter((group) => group in roles(user));
}

// locked objects cannot be deleted
export function canDelete(obj: Owned | null | undefined): boolean {
    return !!obj && !obj._sis?.locked;
}

// Entities (and hooks and scripts, without a schema): the user needs a role in
// every owner group, or in one of them with any_owner_can_modify. An object
// without owners takes its schema's.
export function canManageEntity(user: LoggedInUser | null, entity: Owned, schema?: Owned): boolean {
    if (!user) {
        return false;
    }
    if (user.super_user) {
        return true;
    }
    const meta = entity._sis || {};
    const owner = meta.owner || schema?._sis?.owner || [];
    const groups = owner.filter((group) => roles(user)[group]).length;
    return groups === owner.length || (!!meta.any_owner_can_modify && groups > 0);
}

// Schemas: the user must administer every owner group, or one of them with
// any_owner_can_modify. Anyone logged in may change an open schema.
export function canManageSchema(user: LoggedInUser | null, schema: Schema): boolean {
    if (!user) {
        return false;
    }
    if (user.super_user || schema.is_open) {
        return true;
    }
    const owner = schema._sis.owner || [];
    const groups = owner.filter((group) => roles(user)[group] === "admin").length;
    return groups === owner.length || (groups > 0 && !!schema.any_owner_can_modify);
}

// Entities can be added by members of an owner group, or by anyone with a role
// when the schema is open or public.
export function canAddEntity(user: LoggedInUser | null, schema: Schema): boolean {
    if (!user) {
        return false;
    }
    if (user.super_user) {
        return true;
    }
    if (!hasRoles(user)) {
        return false;
    }
    if (schema.is_open || schema.is_public) {
        return true;
    }
    return (schema._sis.owner || []).some((group) => group in roles(user));
}

// administrators of any group can add schemas
export function canAddSchema(user: LoggedInUser | null): boolean {
    const groups = adminGroups(user);
    return groups === true || (!!groups && groups.length > 0);
}

// anyone with a role can add hooks and scripts
export function canAddHookOrScript(user: LoggedInUser | null): boolean {
    return !!user && (!!user.super_user || hasRoles(user));
}

// super users and users without roles cannot create persistent tokens yet
export function canAddToken(user: LoggedInUser | null): boolean {
    return !!user && !user.super_user && hasRoles(user);
}

// administrators edit the roles of other users, but not of super users
export function canManageUser(user: LoggedInUser | null, other: User): boolean {
    return !other.super_user && other.name !== user?.username && canAddSchema(user);
}

// only super users add and remove users
export function canAddOrRemoveUsers(user: LoggedInUser | null): boolean {
    return adminGroups(user) === true;
}

// whether the user may grant or revoke a role in the group
export function canManageRole(user: LoggedInUser | null, group: string): boolean {
    const groups = adminGroups(user);
    return groups === true || (!!groups && groups.includes(group));
}

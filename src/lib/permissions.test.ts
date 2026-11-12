import { describe, expect, it } from "vitest";
import type { Schema } from "./api/types";
import { adminGroups, allGroups, canAddEntity, canAddHookOrScript, canAddOrRemoveUsers, canAddSchema, canAddToken,
         canDelete, canManageEntity, canManageRole, canManageSchema, canManageUser, ownerSubset } from "./permissions";
import type { LoggedInUser } from "./session";

function user(fields: Partial<LoggedInUser>): LoggedInUser {
    return { username: "u", token: "t", expirationTime: Date.now() + 1000, ...fields };
}

const root = user({ username: "root", super_user: true });
const schema: Schema = { name: "s", definition: {}, _sis: { owner: ["ops", "dba"] } };

describe("permissions", function() {
    it("lets nobody do anything when logged out", function() {
        expect(adminGroups(null)).toBeNull();
        expect(allGroups(null)).toEqual([]);
        expect(ownerSubset(null, schema)).toEqual([]);
        expect(canManageEntity(null, {}, schema)).toBe(false);
        expect(canManageSchema(null, schema)).toBe(false);
        expect(canAddEntity(null, schema)).toBe(false);
        expect(canAddSchema(null)).toBe(false);
        expect(canAddHookOrScript(null)).toBe(false);
        expect(canAddToken(null)).toBe(false);
        expect(canManageUser(null, { name: "x", roles: {} })).toBe(false);
        expect(canManageRole(null, "ops")).toBe(false);
    });

    it("lets super users do everything but create persistent tokens", function() {
        expect(adminGroups(root)).toBe(true);
        expect(allGroups(root)).toBe(true);
        expect(ownerSubset(root, schema)).toEqual(["ops", "dba"]);
        expect(canManageEntity(root, {}, schema)).toBe(true);
        expect(canManageSchema(root, schema)).toBe(true);
        expect(canAddEntity(root, schema)).toBe(true);
        expect(canAddSchema(root)).toBe(true);
        expect(canAddOrRemoveUsers(root)).toBe(true);
        expect(canManageRole(root, "anything")).toBe(true);
        expect(canAddToken(root)).toBe(false);
    });

    it("needs a role in every owner group to manage an entity", function() {
        const ops = user({ roles: { ops: "user" } });
        expect(canManageEntity(ops, {}, schema)).toBe(false);
        expect(canManageEntity(ops, { _sis: { owner: ["ops"] } }, schema)).toBe(true);
        expect(canManageEntity(ops, { _sis: { owner: ["ops", "dba"], any_owner_can_modify: true } }, schema)).toBe(true);
        expect(canManageEntity(ops, { _sis: { owner: ["dba"], any_owner_can_modify: true } }, schema)).toBe(false);
        // hooks and scripts have no schema
        expect(canManageEntity(ops, { _sis: { owner: ["ops"] } })).toBe(true);
        expect(canManageEntity(ops, { _sis: { owner: ["dba"] } })).toBe(false);
    });

    it("needs to administer every owner group to manage a schema", function() {
        expect(canManageSchema(user({ roles: { ops: "admin", dba: "user" } }), schema)).toBe(false);
        expect(canManageSchema(user({ roles: { ops: "admin", dba: "admin" } }), schema)).toBe(true);
        expect(canManageSchema(user({ roles: { ops: "admin" } }), { ...schema, any_owner_can_modify: true })).toBe(true);
        expect(canManageSchema(user({ roles: { ops: "user" } }), { ...schema, any_owner_can_modify: true })).toBe(false);
        expect(canManageSchema(user({ roles: {} }), { ...schema, is_open: true })).toBe(true);
    });

    it("lets members of an owner group add entities", function() {
        const dba = user({ roles: { dba: "user" } });
        expect(canAddEntity(dba, schema)).toBe(true);
        expect(canAddEntity(dba, { ...schema, _sis: { owner: ["other"] } })).toBe(false);
        expect(canAddEntity(dba, { ...schema, is_open: true, _sis: { owner: ["other"] } })).toBe(true);
        expect(canAddEntity(dba, { ...schema, is_public: true, _sis: { owner: ["other"] } })).toBe(true);
        expect(canAddEntity(user({ roles: {} }), { ...schema, is_open: true })).toBe(false);
    });

    it("offers new entities the owner groups the user belongs to", function() {
        expect(ownerSubset(user({ roles: { dba: "user", qa: "admin" } }), schema)).toEqual(["dba"]);
    });

    it("lists the groups a user administers and belongs to", function() {
        const u = user({ roles: { ops: "admin", dev: "user", qa: "admin" } });
        expect(adminGroups(u)).toEqual(["ops", "qa"]);
        expect(allGroups(u)).toEqual(["ops", "dev", "qa"]);
        expect(canManageRole(u, "qa")).toBe(true);
        expect(canManageRole(u, "dev")).toBe(false);
    });

    it("lets administrators add schemas and edit other users", function() {
        const admin = user({ username: "a", roles: { ops: "admin" } });
        const member = user({ username: "m", roles: { ops: "user" } });
        expect(canAddSchema(admin)).toBe(true);
        expect(canAddSchema(member)).toBe(false);
        expect(canManageUser(admin, { name: "m", roles: { ops: "user" } })).toBe(true);
        expect(canManageUser(admin, { name: "a", roles: { ops: "admin" } })).toBe(false);
        expect(canManageUser(admin, { name: "root", roles: {}, super_user: true })).toBe(false);
        expect(canManageUser(member, { name: "a", roles: {} })).toBe(false);
        expect(canAddOrRemoveUsers(admin)).toBe(false);
    });

    it("lets users with a role add hooks, scripts and persistent tokens", function() {
        const member = user({ roles: { ops: "user" } });
        const nobody = user({ roles: {} });
        expect(canAddHookOrScript(member)).toBe(true);
        expect(canAddHookOrScript(nobody)).toBe(false);
        expect(canAddToken(member)).toBe(true);
        expect(canAddToken(nobody)).toBe(false);
    });

    it("keeps locked objects from being deleted", function() {
        expect(canDelete({ _sis: { locked: true } })).toBe(false);
        expect(canDelete({ _sis: {} })).toBe(true);
        expect(canDelete({})).toBe(true);
        expect(canDelete(null)).toBe(false);
    });
});

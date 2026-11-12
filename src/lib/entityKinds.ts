// What the entity form pages edit: entities of a schema, hooks or scripts.

import type { RouteLocationNormalizedLoaded } from "vue-router";

export type EntityKind = "entity" | "hook" | "script";

export function entityKind(route: RouteLocationNormalizedLoaded): EntityKind {
    const name = String(route.name);
    return name.startsWith("hook") ? "hook" : name.startsWith("script") ? "script" : "entity";
}

// the list page of what the route shows
export function listPath(route: RouteLocationNormalizedLoaded): string {
    const kind = entityKind(route);
    return kind === "entity" ? "/entities/" + route.params.schema : kind === "hook" ? "/hooks" : "/scripts";
}

// The pages, at the same urls (hash based) as the AngularJS UI's states, which
// other tools link to.

import { createRouter, createWebHashHistory, type RouteLocationNormalized, type RouteRecordRaw } from "vue-router";
import { stringifyQuery } from "./lib/url";
import AppLayout from "./pages/AppLayout.vue";
import { session } from "./services";
import { state } from "./state";

const PendingPage = () => import("./pages/PendingPage.vue");

const routes: RouteRecordRaw[] = [
    {
        path: "/",
        component: AppLayout,
        children: [
            { path: "", redirect: "/schemas" },
            { path: "login", name: "login", component: () => import("./pages/LoginPage.vue") },
            { path: "users", name: "users", component: () => import("./pages/UserListPage.vue") },
            { path: "schemas", name: "schemas", component: () => import("./pages/SchemaListPage.vue") },
            { path: "schemas/add", name: "schema-add", component: PendingPage },
            { path: "schemas/edit/:schema", name: "schema-edit", component: PendingPage },
            { path: "entities/:schema", name: "entities", component: () => import("./pages/EntityListPage.vue") },
            { path: "entities/:schema/add", name: "entity-add", component: PendingPage },
            { path: "entities/:schema/edit/:eid", name: "entity-edit", component: PendingPage },
            { path: "entities/:schema/view/:eid", name: "entity-view", component: PendingPage },
            { path: "hooks", name: "hooks", component: () => import("./pages/HookListPage.vue") },
            { path: "hooks/add", name: "hook-add", component: PendingPage },
            { path: "hooks/edit/:id", name: "hook-edit", component: PendingPage },
            { path: "hooks/view/:id", name: "hook-view", component: PendingPage },
            { path: "scripts", name: "scripts", component: () => import("./pages/ScriptListPage.vue") },
            { path: "scripts/add", name: "script-add", component: PendingPage },
            { path: "scripts/edit/:id", name: "script-edit", component: PendingPage },
            { path: "scripts/view/:id", name: "script-view", component: PendingPage },
            { path: "tokens", name: "tokens", component: () => import("./pages/TokenListPage.vue") },
            {
                path: "commits/entities/:schema/:id",
                name: "entity-commits",
                component: () => import("./pages/CommitListPage.vue")
            },
            { path: "commits/:type/:id", name: "commits", component: () => import("./pages/CommitListPage.vue") }
        ]
    },
    { path: "/docs", redirect: "/docs/index" },
    { path: "/docs/:doc", name: "docs", component: () => import("./pages/DocsPage.vue") },
    { path: "/:unknown(.*)*", redirect: "/schemas" }
];

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
    // the AngularJS UI's encoding; parsing accepts it as well as "+" for spaces
    stringifyQuery,
    scrollBehavior(to, from, saved) {
        if (to.hash) {
            const el = document.getElementById(decodeURIComponent(to.hash.slice(1)));
            if (el) {
                return { el };
            }
        }
        return saved || (to.path !== from.path ? { top: 0 } : false);
    }
});

// the page the user came from within the app (null when the page was opened
// directly), for goBack()
let previous: RouteLocationNormalized | null = null;

// Takes the app wide parameters off the url: ?embed=true (shown inside another
// app) and ?username=&token= (log in with a token), as the AngularJS UI did.
router.beforeEach(async function(to) {
    const { embed, username, token, ...query } = to.query;
    if (embed === undefined && !(username && token)) {
        return true;
    }
    if (embed === "true") {
        state.embedded = true;
    }
    if (typeof username === "string" && typeof token === "string" && username && token) {
        try {
            await session.loginWithToken(username, token);
        } catch {
            // an invalid token just leaves the visitor logged out
        }
    }
    return { path: to.path, query, hash: to.hash, replace: true };
});

router.afterEach(function(_to, from) {
    if (from.matched.length) {
        previous = from;
    }
});

// Returns to the previous page if the user got here from another page of the
// app (history.back() keeps that page's query, e.g. a filter), and goes to
// fallback otherwise (e.g. the page was opened from a link).
export function goBack(fallback: string): void {
    if (previous) {
        history.back();
    } else {
        void router.push(fallback);
    }
}

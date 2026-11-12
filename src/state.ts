// App wide state: the login, embed mode and the theme.

import { reactive } from "vue";
import type { LoggedInUser } from "./lib/session";
import { session } from "./services";

export const THEMES = __THEMES__;

export const state = reactive({
    // the logged in user, or null
    user: null as LoggedInUser | null,
    // ?embed=true: the page is shown inside another app, without header,
    // footer and sidebar (for the rest of the visit)
    embedded: false,
    theme: THEMES[0]!,
    // changes on logout, so the current page is rebuilt for a visitor
    pageKey: 0
});

function refreshUser(): void {
    // isLoggedIn also gives the API client the stored token
    state.user = session.isLoggedIn() ? session.currentUser() : null;
}

session.onChange(refreshUser);
refreshUser();

// Checks the stored login with the API once the app starts.
export function verifyLogin(): Promise<unknown> {
    return session.verify();
}

export async function logout(): Promise<void> {
    await session.logout();
    state.pageKey++;
}

export function setTheme(theme: string): void {
    state.theme = theme;
    const link = document.getElementById("theme") as HTMLLinkElement | null;
    if (link) {
        link.href = "./common/css/bootswatch/" + theme + "/bootstrap.min.css";
    }
}

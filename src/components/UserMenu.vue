<script setup lang="ts">
// The login link, or the logged in user's menu, at the right of the navbar.
import { computed } from "vue";
import { useDropdown } from "@/composables/useDropdown";
import { logout, state } from "@/state";
import { showUsersInGroup } from "./dialogs/userDialogs";

const dropdown = useDropdown();

// the user's groups by role; null for super users and users without roles
const groups = computed(function() {
    const user = state.user;
    if (!user || user.super_user) {
        return null;
    }
    const entries = Object.entries(user.roles || {});
    if (!entries.length) {
        return null;
    }
    return {
        admin: entries.filter(([, role]) => role === "admin").map(([group]) => group),
        user: entries.filter(([, role]) => role !== "admin").map(([group]) => group)
    };
});
</script>

<template>
    <ul class="nav navbar-nav navbar-right">
        <li v-if="!state.user">
            <RouterLink to="/login">Login</RouterLink>
        </li>
        <li v-if="state.user" class="dropdown" :class="{ open: dropdown.open.value }">
            <a href="" class="dropdown-toggle" aria-haspopup="true" :aria-expanded="dropdown.open.value" @click="dropdown.toggle">{{ state.user.username }} <span class="caret"></span></a>
            <ul class="dropdown-menu" role="menu">
                <li v-if="state.user.super_user" class="disabled"><a>Super User</a></li>
                <li v-if="groups?.admin.length" class="disabled">
                    <a>Admin of:</a>
                    <ul>
                        <li v-for="group in groups.admin" :key="group" class="disabled"><a href="" @click.prevent="showUsersInGroup(group)">{{ group }}</a></li>
                    </ul>
                </li>
                <li v-if="groups?.user.length" class="disabled">
                    <a>User of:</a>
                    <ul>
                        <li v-for="group in groups.user" :key="group" class="disabled"><a href="" @click.prevent="showUsersInGroup(group)">{{ group }}</a></li>
                    </ul>
                </li>
                <li class="divider"></li>
                <li>
                    <RouterLink to="/tokens">Manage Tokens</RouterLink>
                </li>
                <li class="divider"></li>
                <li><a href="" @click.prevent="logout()">Logout</a></li>
            </ul>
        </li>
    </ul>
</template>

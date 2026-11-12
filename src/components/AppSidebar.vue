<script setup lang="ts">
// The section links at the right; the current section is highlighted,
// including its add/edit/view/history pages.
import { useRoute } from "vue-router";
import { state } from "@/state";

const route = useRoute();

const SECTIONS: Record<string, string[]> = {
    schemas: ["schemas", "schema-add", "schema-edit", "entities", "entity-add", "entity-edit", "entity-view", "entity-commits"],
    hooks: ["hooks", "hook-add", "hook-edit", "hook-view"],
    scripts: ["scripts", "script-add", "script-edit", "script-view"],
    users: ["users"]
};

function inSection(section: string): boolean {
    if (route.name === "commits") {
        return route.params.type === section;
    }
    return SECTIONS[section]!.includes(String(route.name));
}

function isEntityPage(): boolean {
    return String(route.name).startsWith("entit");
}
</script>

<template>
    <div v-show="!state.embedded" class="col-md-2 nav-toc">
        <ul class="nav affix" role="complementary">
            <li :class="{ active: inSection('schemas') }">
                <RouterLink to="/schemas">Schemas</RouterLink>
            </li>
            <li v-if="isEntityPage() && route.name !== 'entity-commits'">
                <ul>
                    <li><RouterLink :to="'/entities/' + route.params.schema">{{ route.params.schema }}</RouterLink></li>
                </ul>
            </li>
            <li :class="{ active: inSection('hooks') }"><RouterLink to="/hooks">Hooks</RouterLink></li>
            <li :class="{ active: inSection('scripts') }"><RouterLink to="/scripts">Scripts</RouterLink></li>
            <li :class="{ active: inSection('users') }"><RouterLink to="/users">Users</RouterLink></li>
        </ul>
    </div>
</template>

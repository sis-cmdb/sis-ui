<script setup lang="ts">
// Placeholder until the app shell is ported: shows the footer's version line,
// which proves the runtime config and the API client work.
import { onMounted, ref } from "vue";
import type { BuildInfo } from "./lib/api/types";
import { api } from "./services";

const apiInfo = ref<BuildInfo | null>(null);
const error = ref("");
const ui = __UI_BUILD__;

onMounted(async function() {
    try {
        apiInfo.value = await api.info();
    } catch (err) {
        error.value = err instanceof Error ? err.message : String(err);
    }
});
</script>

<template>
    <div class="footer">
        <small v-if="apiInfo">API {{ apiInfo.version }}-{{ apiInfo.build_num }}</small>
        <small v-else-if="error" class="text-danger">{{ error }}</small>
        | <small>UI {{ ui.version }}-{{ ui.build_num }}</small>
    </div>
</template>

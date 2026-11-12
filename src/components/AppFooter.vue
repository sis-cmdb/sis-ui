<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { BuildInfo } from "@/lib/api/types";
import { api } from "@/services";

const apiInfo = ref<BuildInfo>({});
const uiInfo = __UI_BUILD__;

onMounted(async function() {
    try {
        apiInfo.value = await api.info();
    } catch {
        // the footer just stays without the API version
    }
});
</script>

<template>
    <div class="row">
        <div class="pull-left">
            <small>API {{ apiInfo.version }}-{{ apiInfo.build_num }}</small> | <small>UI {{ uiInfo.version }}-{{ uiInfo.build_num }}</small>
        </div>
    </div>
</template>

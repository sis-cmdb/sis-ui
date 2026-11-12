<script setup lang="ts">
// The app's pages (all but the docs): the page and the sidebar. A page is
// built anew when the path changes (e.g. from one entity to another), but not
// for its query (filter and page of lists).
import AppSidebar from "@/components/AppSidebar.vue";
</script>

<template>
    <div class="row">
        <div class="col-md-10"><RouterView v-slot="{ Component, route }"><component :is="Component" :key="route.path" /></RouterView></div>
        <AppSidebar />
    </div>
</template>

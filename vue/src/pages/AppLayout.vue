<script setup lang="ts">
// The app's pages (all but the docs): the page and the sidebar.
import AppSidebar from "@/components/AppSidebar.vue";
</script>

<template>
    <div class="row">
        <div class="col-md-10"><RouterView /></div>
        <AppSidebar />
    </div>
</template>

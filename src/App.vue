<script setup lang="ts">
// The page frame, as in the AngularJS index.html: navbar, page, footer.
import AppFooter from "./components/AppFooter.vue";
import AppHeader from "./components/AppHeader.vue";
import DialogHost from "./components/DialogHost.vue";
import { state } from "./state";
</script>

<template>
    <AppHeader v-show="!state.embedded" />
    <div class="container">
        <RouterView :key="state.pageKey" />
    </div>
    <div v-show="!state.embedded" class="footer">
        <div class="container">
            <AppFooter />
        </div>
    </div>
    <DialogHost />
</template>

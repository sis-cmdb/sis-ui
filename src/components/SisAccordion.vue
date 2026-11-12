<script setup lang="ts">
// ui-bootstrap's accordion with close-others: opening a group closes the others.
import { provide, ref } from "vue";
import { ACCORDION } from "./accordion";

const openGroup = ref<symbol | null>(null);
provide(ACCORDION, openGroup);
</script>

<template>
    <div class="panel-group"><slot /></div>
</template>

<script setup lang="ts">
// The pagination below a list (the AngularJS UI's smart-table template).
import { computed } from "vue";
import { pageNumbers } from "@/lib/pagination";

const DISPLAYED = 7;

const props = defineProps<{ page: number; numPages: number }>();
const emit = defineEmits<{ select: [page: number] }>();

const pages = computed(() => pageNumbers(props.page, props.numPages, DISPLAYED));
const first = computed(() => pages.value[0]!);
const last = computed(() => pages.value[pages.value.length - 1]!);
</script>

<!-- callers wrap it, e.g. in <div class="row text-center"> -->
<template>
    <div><div v-if="pages.length >= 2" class="pagination"><ul class="pagination"><li><a href="" @click.prevent="emit('select', 1)">First</a></li><li v-if="first > DISPLAYED"><a href="" @click.prevent="emit('select', first - DISPLAYED)">...</a></li><li v-for="p in pages" :key="p" :class="{ active: p == page }"><a href="" @click.prevent="emit('select', p)">{{ p }}</a></li><li v-if="last < numPages"><a href="" @click.prevent="emit('select', last + 1)">...</a></li><li><a href="" @click.prevent="emit('select', numPages)">Last</a></li></ul></div></div>
</template>

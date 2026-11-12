<script setup lang="ts">
// A group of a SisAccordion: a heading (the heading prop or the heading slot)
// that opens and closes the content.
import { computed, inject, ref } from "vue";
import { ACCORDION } from "./accordion";

defineProps<{ heading?: string }>();

const id = Symbol("group");
const openGroup = inject(ACCORDION, ref(null));
const isOpen = computed(() => openGroup.value === id);

function toggle(): void {
    openGroup.value = isOpen.value ? null : id;
}
</script>

<template>
    <div class="panel panel-default">
        <div class="panel-heading">
            <h4 class="panel-title">
                <a href="" class="accordion-toggle" @click.prevent="toggle"><slot name="heading"><span>{{ heading }}</span></slot></a>
            </h4>
        </div>
        <div class="panel-collapse collapse" :class="{ in: isOpen }" :style="{ height: isOpen ? 'auto' : '0px' }">
            <div class="panel-body"><slot /></div>
        </div>
    </div>
</template>

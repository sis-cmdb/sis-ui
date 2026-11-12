<script setup lang="ts">
// Renders the open dialogs with the markup and behavior of ui-bootstrap 0.11's
// modals: a backdrop, the window fading in and taking the focus, Escape and
// backdrop clicks dismissing it.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { closeDialog, openDialogs, type OpenDialog } from "../dialogs";

const animate = ref<Record<number, boolean>>({});
const windows = ref<Record<number, HTMLElement | null>>({});

watch(() => openDialogs.map((d) => d.id), async function(ids, oldIds) {
    document.body.classList.toggle("modal-open", ids.length > 0);
    const added = ids.filter((id) => !(oldIds || []).includes(id));
    await nextTick();
    // like ui-bootstrap: fade in and focus on the next tick
    setTimeout(function() {
        for (const id of added) {
            animate.value[id] = true;
            if (!windows.value[id]?.querySelector("[autofocus]")) {
                windows.value[id]?.focus();
            }
        }
    });
}, { immediate: true });

function dismissTop(): void {
    const top = openDialogs[openDialogs.length - 1];
    if (top) {
        closeDialog(top.id);
    }
}

function onKeydown(event: KeyboardEvent): void {
    const top = openDialogs[openDialogs.length - 1];
    if (event.key === "Escape" && top?.options.keyboard) {
        event.preventDefault();
        dismissTop();
    }
}

function onWindowClick(event: MouseEvent, dialog: OpenDialog): void {
    // a click on the window itself, outside the dialog
    if (event.target === event.currentTarget && dialog.options.backdrop && dialog.options.backdrop !== "static" &&
        dialog === openDialogs[openDialogs.length - 1]) {
        closeDialog(dialog.id);
    }
}

function setWindow(id: number, el: unknown): void {
    windows.value[id] = el as HTMLElement | null;
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
    <div v-if="openDialogs.length" class="modal-backdrop fade" :class="{ in: openDialogs.some((d) => animate[d.id]) }" style="z-index: 1040;"></div>
    <div v-for="(dialog, index) in openDialogs" :key="dialog.id" :ref="(el) => setWindow(dialog.id, el)"
         tabindex="-1" role="dialog" class="modal fade" :class="[dialog.options.windowClass, { in: animate[dialog.id] }]"
         :style="{ 'z-index': 1050 + index * 10, display: 'block' }" @click="onWindowClick($event, dialog)">
        <div class="modal-dialog">
            <div class="modal-content">
                <component :is="dialog.component" v-bind="dialog.props"
                           @close="(result: unknown) => closeDialog(dialog.id, result)" @dismiss="closeDialog(dialog.id)" />
            </div>
        </div>
    </div>
</template>

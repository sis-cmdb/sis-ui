<script setup lang="ts">
// Edits code, or a JSON document (Mixed field), in the Ace editor.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { loadAce } from "@/lib/ace";
import type { FieldDescriptor } from "@/lib/schema";

const props = defineProps<{ field: FieldDescriptor; code: unknown; readOnly: boolean; entity?: Record<string, unknown> }>();
const emit = defineEmits<{ close: [result: unknown]; dismiss: [] }>();

const MODES: Record<string, string> = {
    "text/javascript": "javascript",
    "application/javascript": "javascript"
};

const element = ref<HTMLElement | null>(null);
let editor: AceEditor | null = null;

// the Ace mode: the field's code attribute, or from the field it names
// (code_type_field, e.g. a script's script_type)
function codeMode(): string {
    if (typeof props.field.code === "string") {
        return props.field.code;
    }
    const typeField = props.field.code_type_field;
    const type = typeof typeField === "string" ? props.entity?.[typeField] : undefined;
    return typeof type === "string" && MODES[type] ? MODES[type] : "text";
}

onMounted(async function() {
    const ace = await loadAce();
    if (!element.value) {
        return;
    }
    editor = ace.edit(element.value);
    editor.setReadOnly(props.readOnly);
    if (props.field.type === "Mixed") {
        let doc = props.code;
        if (typeof doc === "string") {
            try {
                doc = JSON.parse(doc);
            } catch {
                doc = {};
            }
        }
        editor.setValue(JSON.stringify(doc ?? {}, null, 2));
        editor.getSession().setMode("ace/mode/json");
    } else {
        editor.setValue(typeof props.code === "string" ? props.code : "");
        editor.getSession().setMode("ace/mode/" + codeMode());
    }
});

onBeforeUnmount(() => editor?.destroy());

function save(): void {
    const text = editor?.getValue() ?? "";
    if (props.field.type !== "Mixed") {
        emit("close", text);
        return;
    }
    try {
        emit("close", JSON.parse(text));
    } catch {
        // not JSON yet: keep editing
    }
}
</script>

<template>
    <div>
        <div class="modal-header">
            <h3>Code Editor</h3>
        </div>
        <div class="modal-body no-item-display">
            <span><div ref="element" class="aceEditor"></div></span>
        </div>
        <div class="modal-footer">
            <button v-if="!readOnly" class="btn btn-primary" @click="save">Save</button>
            <button class="btn btn-warning" @click="emit('dismiss')">Close</button>
        </div>
    </div>
</template>

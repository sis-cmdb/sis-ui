<script setup lang="ts">
// A field of the schema's definition on the schema form: remove button, name,
// type and attributes, and for documents and arrays their fields below.
import { computed, watch } from "vue";
import { openDialog } from "@/dialogs";
import { useFieldValidity } from "@/composables/useFormValidity";
import { FIELD_TYPES } from "@/lib/schema";
import { addChild as addChildField, removeField, renameField, setAttributes, setType,
         type SchemaField } from "@/lib/schemaForm";
import { confirm } from "./dialogs";
import SchemaAttributesDialog from "./dialogs/SchemaAttributesDialog.vue";

const props = defineProps<{
    field: SchemaField;
    // the fields of the parent, which hold this one
    siblings: SchemaField[];
    parentType: "Document" | "Array";
    // dotted path within the definition
    path: string;
    // fields sharing their name with a sibling, and locked paths
    duplicates: Set<number>;
    locked: string[];
    // schemas a reference can point to
    schemaNames: string[];
}>();
const emit = defineEmits<{ changed: [] }>();

const reportValidity = useFieldValidity();

// the item type of an array has no name; only new fields can be renamed
const canRename = computed(() => props.field.isNew && props.parentType !== "Array");
const canDelete = computed(function() {
    if (props.locked.includes(props.path)) {
        return false;
    }
    return props.parentType !== "Document" || props.siblings.length > 1;
});
const types = computed(() => FIELD_TYPES.filter((t) => props.parentType !== "Array" || t !== "Array"));
const canModifyChildren = computed(() => (props.field.type === "Array" || props.field.type === "Document") &&
    (!!props.field.name || props.parentType === "Array"));
const canAddChildren = computed(function() {
    if (props.field.type === "Document") {
        return true;
    }
    return !!props.field.name && props.field.type === "Array" && !props.field.children?.length;
});
const children = computed(() => props.field.children || []);
const childParentType = computed(() => (props.field.type === "Array" ? "Array" : "Document"));
const nameValid = computed(() => !(canRename.value && !props.field.name) && !props.duplicates.has(props.field.id));

watch(nameValid, reportValidity, { immediate: true });

function rename(name: string): void {
    renameField(props.field, name);
    emit("changed");
}

function changeType(type: string): void {
    setType(props.field, type);
    emit("changed");
}

async function remove(): Promise<void> {
    if (props.field.name && !props.field.isNew &&
        !await confirm("Confirm delete", "Are you sure you want to delete field '" + props.field.name + "'")) {
        return;
    }
    removeField(props.siblings, props.field);
    emit("changed");
}

function addChild(): void {
    addChildField(props.field);
    emit("changed");
}

async function showAttributes(): Promise<void> {
    const attrs = await openDialog<Record<string, unknown>>(SchemaAttributesDialog, {
        field: props.field,
        schemaNames: props.schemaNames
    }, { windowClass: "narrow-modal-window" });
    if (attrs) {
        setAttributes(props.field, attrs);
        emit("changed");
    }
}
</script>

<template>
    <div>
        <div>
            <div class="input-error">
                <a href="" :disabled="!canDelete || undefined" class="btn btn-xs btn-primary" style="margin-right: 4px;" :aria-label="'Remove field ' + field.name" @click.prevent="remove">
                    <span class="glyphicon glyphicon-minus"></span>
                </a>
                <!-- no width: the AngularJS template's width never applied, so names use
                     the input's default width and .schema-label's -->
                <span><input v-if="canRename" aria-label="Field name" style="margin-right: 4px;" :value="field.name" required :aria-invalid="!nameValid" @input="rename(($event.target as HTMLInputElement).value)"><label v-else class="schema-label" style="margin-right: 4px;">{{ field.name }}</label></span>
                <select :value="field.type" aria-label="Field type" style="margin-right: 4px;" @change="changeType(($event.target as HTMLSelectElement).value)"><option v-for="type in types" :key="type" :value="type">{{ type }}</option></select>
                <button type="button" class="btn btn-default btn-xs" :aria-label="'Field attributes ' + field.name" @click="showAttributes">
                    <span class="glyphicon glyphicon-list"></span>
                </button>
            </div>
        </div>
    </div>
    <div v-if="canModifyChildren">
        <ul>
            <li v-for="child in children" :key="child.id">
                <div><SchemaDefinitionField :field="child" :siblings="field.children!" :parent-type="childParentType" :path="path + '.' + child.name" :duplicates="duplicates" :locked="locked" :schema-names="schemaNames" @changed="emit('changed')" /></div>
            </li>
            <li v-if="canAddChildren">
                <a href="" class="btn btn-xs btn-primary" @click.prevent="addChild">
                    <span class="glyphicon glyphicon-plus"></span> Add
                </a>
            </li>
        </ul>
    </div>
</template>

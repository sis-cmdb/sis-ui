<script setup lang="ts">
// Adds or edits a schema (schema-mod.html): its own fields, the definition
// editor and the SIS fields.
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showApiError } from "@/components/dialogs";
import SchemaDefinitionField from "@/components/SchemaDefinitionField.vue";
import SchemaValueRow, { type ValueField } from "@/components/SchemaValueRow.vue";
import { provideFormValidity } from "@/composables/useFormValidity";
import type { Schema } from "@/lib/api/types";
import { looseEquals } from "@/lib/equals";
import { labelWidth, toStringArray } from "@/lib/format";
import { adminGroups, canManageSchema } from "@/lib/permissions";
import { duplicateIds, fieldPaths, fieldsFromDefinition, nameColumnLength, newField, toDefinition,
         type SchemaField } from "@/lib/schemaForm";
import { goBack } from "@/router";
import { api } from "@/services";
import { state } from "@/state";

const route = useRoute();
const router = useRouter();
const action = route.name === "schema-add" ? "add" : "edit";
// read once: loading continues after the user may have navigated away
const params = { ...route.params };

const title = ref("");
const showJson = ref(false);
const loaded = ref(false);
const schema = reactive<Schema>({} as Schema);
const original = ref<unknown>(null);
const originalLocked = ref<string[]>([]);
const definition = ref<SchemaField[]>([]);
// the definition is rebuilt from the editor once it was changed
const definitionChanged = ref(false);
const schemaNames = ref<string[]>([]);
const ownerChoices = ref<string[] | null>(null);
// Lock All rebuilds the locked_fields input with the new paths
const lockedText = ref<string | undefined>(undefined);
const lockedVersion = ref(0);
const valid = provideFormValidity();

const VALUE_FIELDS: ValueField[] = [
    { name: "name", type: "String", required: true, readonly: action === "edit", match: "/^[0-9a-z_]+$/" },
    { name: "description", type: "String" },
    { name: "locked_fields", type: "String" },
    { name: "is_open", type: "Boolean" },
    { name: "is_public", type: "Boolean" },
    { name: "id_field", type: "String" },
    { name: "any_owner_can_modify", type: "Boolean" },
    { name: "track_history", type: "Boolean" }
];

const metaFields = computed<ValueField[]>(() => [
    { name: "locked", type: "Boolean" },
    { name: "immutable", type: "Boolean" },
    { name: "tags", type: "String" },
    ownerChoices.value ? { name: "owner", type: "Array", enum: ownerChoices.value } : { name: "owner", type: "String", required: true }
]);

const rootWidth = labelWidth(nameColumnLength([...VALUE_FIELDS, { name: "definition" }, { name: "_sis" }]));
const metaWidth = computed(() => labelWidth(nameColumnLength(metaFields.value)));
const duplicates = computed(() => duplicateIds(definition.value));
const locked = computed(() => [...originalLocked.value, ...(schema.locked_fields || [])]);

// the schema to save
const payload = computed<Schema>(() => ({
    ...schema,
    definition: definitionChanged.value ? toDefinition(definition.value) : schema.definition
}));
const canSave = computed(() => loaded.value && valid.value && !looseEquals(original.value, payload.value));

function emptySchema(): Schema {
    return {
        name: "",
        definition: { name: "String" },
        locked_fields: [],
        is_open: false,
        is_public: false,
        track_history: true,
        id_field: "_id",
        any_owner_can_modify: false,
        _sis: { owner: [], locked: false, tags: [] }
    };
}

async function load(): Promise<void> {
    let start = emptySchema();
    if (action === "add") {
        if (!adminGroups(state.user)) {
            throw new Error("not allowed");
        }
        title.value = "Add a new schema";
    } else {
        const name = String(params.schema);
        const existing = await api.schemas.get(name);
        if (!canManageSchema(state.user, existing)) {
            throw new Error("not allowed");
        }
        title.value = "Modify schema " + name;
        start = { ...start, ...JSON.parse(JSON.stringify(existing)) };
    }
    schemaNames.value = (await api.schemas.listAll({ sort: "name", with_counts: true })).map((s) => s.name);
    const groups = adminGroups(state.user);
    ownerChoices.value = start.is_public || start.is_open || !Array.isArray(groups) ? null : groups;
    start._sis.owner = [...(start._sis.owner || [])].sort();
    Object.assign(schema, start);
    original.value = JSON.parse(JSON.stringify(start));
    originalLocked.value = start.locked_fields || [];
    definition.value = fieldsFromDefinition(start.definition, action === "add");
    loaded.value = true;
}

load().catch(() => router.replace("/schemas"));

function setValue(name: string, value: unknown): void {
    if (name === "locked_fields" && typeof value === "string") {
        value = toStringArray(value);
    }
    (schema as unknown as Record<string, unknown>)[name] = value;
}

function setMeta(name: string, value: unknown): void {
    if (name === "owner") {
        value = (typeof value === "string" ? toStringArray(value) : (value as string[] | undefined) || []).sort();
    } else if (name === "tags") {
        value = toStringArray((value as string | undefined) || "");
    }
    schema._sis[name] = value;
}

function toggleOwner(choice: string): void {
    const owner = schema._sis.owner!;
    const index = owner.indexOf(choice);
    if (index === -1) {
        owner.push(choice);
    } else {
        owner.splice(index, 1);
    }
}

function addField(): void {
    definition.value.push(newField());
    definitionChanged.value = true;
}

function lockAll(): void {
    const paths = fieldPaths(definition.value);
    schema.locked_fields = paths;
    lockedText.value = paths.join(", ");
    lockedVersion.value++;
}

async function save(): Promise<void> {
    try {
        if (action === "add") {
            await api.schemas.create(payload.value);
        } else {
            await api.schemas.update(schema.name, payload.value);
        }
    } catch (err) {
        await showApiError(err);
        return;
    }
    void router.push("/schemas");
}
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3><strong>{{ title }}</strong></h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <button :disabled="!canSave" class="btn btn-primary btn-sm" @click="save">Save</button>
        <button class="btn btn-warning btn-sm" @click="goBack('/schemas')">Cancel</button>
        <button type="button" class="btn btn-info btn-sm" :class="{ active: showJson }" @click="showJson = !showJson">Toggle JSON</button>
        <button type="button" class="btn btn-info btn-sm" @click="lockAll">Lock All</button>
    </div>
    <div class="row no-item-display">
        <div :class="{ 'col-md-12': !showJson, 'col-md-6': showJson }">
            <form class="form-inline" role="form" aria-label="Fields" novalidate name="schemaMod" @submit.prevent>
                <template v-if="loaded">
                    <li v-for="field in VALUE_FIELDS" :key="field.name + (field.name === 'locked_fields' ? lockedVersion : '')">
                        <div><div><SchemaValueRow :field="field" :value="(schema as unknown as Record<string, unknown>)[field.name]" :initial-text="field.name === 'locked_fields' ? lockedText : undefined" :width="rootWidth" @change="setValue(field.name, $event)" /></div></div>
                    </li>
                    <li>
                        <div>
                            <div>
                                <label class="schema-label" :style="{ width: rootWidth }">definition</label>
                            </div>
                            <div>
                                <ul>
                                    <li v-for="field in definition" :key="field.id">
                                        <div><SchemaDefinitionField :field="field" :siblings="definition" parent-type="Document" :path="field.name" :duplicates="duplicates" :locked="locked" :schema-names="schemaNames" @changed="definitionChanged = true" /></div>
                                    </li>
                                    <li>
                                        <a href="" class="btn btn-xs btn-primary" @click.prevent="addField">
                                            <span class="glyphicon glyphicon-plus"></span> Add
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </li>
                </template>
            </form>
            <hr/>
            <h4>SIS fields</h4>
            <form class="form-inline" role="form" aria-label="SIS fields" novalidate name="metaMod" @submit.prevent>
                <li v-if="loaded">
                    <div>
                        <div></div>
                        <div>
                            <ul>
                                <li v-for="field in metaFields" :key="field.name">
                                    <div><div><SchemaValueRow :field="field" :value="schema._sis[field.name]" :width="metaWidth" @change="setMeta(field.name, $event)" @toggle="toggleOwner" /></div></div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </li>
            </form>
        </div>
        <div v-if="showJson" class="col-md-6">
            <pre>{{ JSON.stringify(payload, null, 2) }}</pre>
        </div>
    </div>
</template>

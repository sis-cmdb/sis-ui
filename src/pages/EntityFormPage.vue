<script setup lang="ts">
// Adds or edits an entity, hook or script (entity-mod.html). ?clone=<id>
// starts a new one from an existing one.
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showApiError } from "@/components/dialogs";
import EntityField from "@/components/EntityField.vue";
import { provideFormValidity } from "@/composables/useFormValidity";
import type { Endpoint } from "@/lib/api/client";
import type { Entity, Schema } from "@/lib/api/types";
import { entityKind, listPath } from "@/lib/entityKinds";
import { fillDefaults, maxNameLength, normalizeReferences, sisFields } from "@/lib/entityForm";
import { looseEquals } from "@/lib/equals";
import { labelWidth } from "@/lib/format";
import { allGroups, canAddEntity, canManageEntity, ownerSubset } from "@/lib/permissions";
import { describeFields, hookSchema, idField, objectField, scriptSchema, type FieldDescriptor } from "@/lib/schema";
import { goBack } from "@/router";
import { api } from "@/services";
import { state } from "@/state";

type Obj = Record<string, unknown>;

const route = useRoute();
const router = useRouter();
// read once: loading continues after the user may have navigated away
const params = { ...route.params };
const query = { ...route.query };
const kind = entityKind(route);
const action = String(route.name).endsWith("add") ? "add" : "edit";
const list = listPath(route);

const title = ref("");
const showJson = ref(false);
const schema = ref<Schema | null>(null);
const fields = ref<FieldDescriptor[]>([]);
const meta = ref<FieldDescriptor | null>(null);
const original = ref<Obj>({});
const entity = reactive<Obj>({});
const valid = provideFormValidity();

const width = computed(() => labelWidth(maxNameLength([...fields.value, ...(meta.value ? [meta.value] : [])], action)));
const canSave = computed(() => !looseEquals(original.value, entity) && valid.value);

function endpoint(): Endpoint<Obj> {
    if (kind === "entity") {
        return api.entities(String(params.schema)) as unknown as Endpoint<Obj>;
    }
    return (kind === "hook" ? api.hooks : api.scripts) as unknown as Endpoint<Obj>;
}

// the id the API knows the object by
function objectId(obj: Obj): string {
    return String(kind === "entity" ? obj._id : obj.name);
}

// the object to start from: a copy of ?clone= without its _ fields, or nothing
async function startingObject(): Promise<Obj> {
    const clone = query.clone;
    const obj: Obj = {};
    if (typeof clone === "string" && clone) {
        try {
            for (const [key, value] of Object.entries(await endpoint().get(clone))) {
                if (key[0] !== "_") {
                    obj[key] = value;
                }
            }
        } catch {
            // start empty
        }
    }
    obj._sis = { owner: [], tags: [] };
    return obj;
}

async function load(): Promise<void> {
    const user = state.user;
    let orig: Obj;
    let ownerChoices: string[] | null;
    if (kind === "entity") {
        const name = String(params.schema);
        const loaded = await api.schemas.get(name);
        if (action === "add") {
            if (!canAddEntity(user, loaded)) {
                throw new Error("not allowed");
            }
            orig = await startingObject();
            title.value = "Add a new entity of type " + name;
        } else {
            orig = await endpoint().get(String(params.eid));
            if (!canManageEntity(user, orig as Entity, loaded)) {
                throw new Error("not allowed");
            }
            title.value = "Modify entity of type " + name + " - " + objectField(orig, idField(loaded));
        }
        schema.value = loaded;
        ownerChoices = ownerSubset(user, loaded);
    } else {
        const groups = allGroups(user);
        // super users type the owners of hooks and scripts
        ownerChoices = groups === true ? null : groups;
        schema.value = kind === "hook" ? hookSchema(groups === true ? [] : groups) : scriptSchema(groups === true ? [] : groups);
        orig = action === "add" ? await startingObject() : await endpoint().get(String(params.id));
        if (!canManageEntity(user, orig as Entity)) {
            throw new Error("not allowed");
        }
        title.value = action === "add" ? "Add a new " + kind : "Modify " + kind + " " + params.id;
    }
    fields.value = describeFields(schema.value.definition);
    meta.value = sisFields(ownerChoices, action);
    // compared in the form the form stores, so an untouched object is unchanged
    normalizeReferences(orig, fields.value);
    original.value = JSON.parse(JSON.stringify(orig));
    Object.assign(entity, JSON.parse(JSON.stringify(orig)));
    // the fields the object lacks start with their default values, as shown
    fillDefaults(entity, [...fields.value, meta.value]);
}

load().catch(() => router.replace(list));

async function save(): Promise<void> {
    try {
        if (action === "add") {
            await endpoint().create(entity, kind === "entity" ? { forceMixed: "true" } : undefined);
        } else {
            await endpoint().update(objectId(entity), entity, kind === "entity" ? { forceMixed: "true" } : undefined);
        }
    } catch (err) {
        await showApiError(err);
        return;
    }
    if (kind === "entity") {
        goBack(list);
    } else {
        void router.push(list);
    }
}
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3><strong>{{ title }}</strong></h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <button :disabled="!canSave" class="btn btn-primary btn-sm" @click="save">Save</button>
        <button class="btn btn-warning btn-sm" @click="goBack(list)">Cancel</button>
        <button type="button" class="btn btn-info btn-sm" :class="{ active: showJson }" @click="showJson = !showJson">Toggle JSON</button>
    </div>
    <div class="row no-item-display">
        <div :class="{ 'col-md-12': !showJson, 'col-md-6': showJson }">
            <form class="form-inline css-form" role="form" aria-label="Fields" name="entityMod" novalidate @submit.prevent>
                <li v-for="field in fields" :key="field.name">
                    <div><EntityField :field="field" :container="entity" :field-key="field.name!" :path="field.name!" :action="action" :width="width" :entity="entity" /></div>
                </li>
            </form>
            <hr/>
            <h4>SIS fields</h4>
            <form class="form-inline" role="form" aria-label="SIS fields" novalidate name="metaMod" @submit.prevent>
                <li v-if="meta">
                    <div><EntityField :field="meta" :container="entity" field-key="_sis" path="_sis" :action="action" :width="width" :entity="entity" /></div>
                </li>
            </form>
        </div>
        <div v-if="showJson" class="col-md-6">
            <pre>{{ JSON.stringify(entity, null, 2) }}</pre>
        </div>
    </div>
</template>

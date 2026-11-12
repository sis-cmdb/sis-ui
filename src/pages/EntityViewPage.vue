<script setup lang="ts">
// Shows an entity, hook or script read only (entity-view.html); code and JSON
// fields open read only in the code editor.
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import EntityField from "@/components/EntityField.vue";
import type { Entity } from "@/lib/api/types";
import { entityKind, listPath } from "@/lib/entityKinds";
import { fillDefaults, maxNameLength, sisFields } from "@/lib/entityForm";
import { labelWidth } from "@/lib/format";
import { canManageEntity } from "@/lib/permissions";
import { describeFields, hookSchema, idField, objectField, scriptSchema, type FieldDescriptor } from "@/lib/schema";
import { api } from "@/services";
import { state } from "@/state";

const route = useRoute();
const router = useRouter();
// read once: loading continues after the user may have navigated away
const params = { ...route.params };
const kind = entityKind(route);

const title = ref("");
const showJson = ref(false);
const fields = ref<FieldDescriptor[]>([]);
const meta = sisFields(null, "view");
const obj = reactive<Record<string, unknown>>({});
const loaded = ref(false);

const width = computed(() => labelWidth(maxNameLength([...fields.value, meta], "view")));
const canManage = computed(() => loaded.value && canManageEntity(state.user, obj as Entity));

async function load(): Promise<void> {
    let result: Record<string, unknown>;
    if (kind === "entity") {
        const name = String(params.schema);
        const schema = await api.schemas.get(name);
        result = await api.entities(name).get(String(params.eid));
        title.value = "View entity " + objectField(result, idField(schema)) + " of type " + name;
        fields.value = describeFields(schema.definition);
    } else {
        result = await (kind === "hook" ? api.hooks : api.scripts).get(String(params.id)) as never;
        title.value = "View " + kind + " " + result.name;
        fields.value = describeFields((kind === "hook" ? hookSchema([]) : scriptSchema([])).definition);
    }
    Object.assign(obj, result);
    fillDefaults(obj, [...fields.value, meta]);
    loaded.value = true;
}

load().catch(() => router.replace(listPath(route)));

function edit(): void {
    void router.push({ name: String(route.name).replace("view", "edit"), params });
}
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3><strong>{{ title }}</strong></h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <button v-if="canManage" class="btn btn-primary btn-sm" @click="edit">Edit</button>
        <button type="button" class="btn btn-info btn-sm" :class="{ active: showJson }" @click="showJson = !showJson">Toggle JSON</button>
    </div>
    <div class="row no-item-display">
        <div :class="{ 'col-md-12': !showJson, 'col-md-6': showJson }">
            <form class="form-inline css-form" role="form" aria-label="Fields" name="entityView" novalidate @submit.prevent>
                <template v-if="loaded">
                    <li v-for="field in fields" :key="field.name">
                        <div><EntityField :field="field" :container="obj" :field-key="field.name!" :path="field.name!" action="view" :width="width" :entity="obj" /></div>
                    </li>
                </template>
                <hr/>
                <h4>SIS fields</h4>
                <li v-if="loaded">
                    <div><EntityField :field="meta" :container="obj" field-key="_sis" path="_sis" action="view" :width="width" :entity="obj" /></div>
                </li>
            </form>
        </div>
        <div v-if="showJson" class="col-md-6">
            <pre>{{ JSON.stringify(obj, null, 2) }}</pre>
        </div>
    </div>
</template>

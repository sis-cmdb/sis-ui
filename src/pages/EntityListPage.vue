<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { confirmDelete } from "@/components/dialogs";
import FilterBox from "@/components/FilterBox.vue";
import ListPagination from "@/components/ListPagination.vue";
import OwnerLabels from "@/components/OwnerLabels.vue";
import SchemaInformation from "@/components/SchemaInformation.vue";
import { usePagedList } from "@/composables/usePagedList";
import type { Entity, Schema } from "@/lib/api/types";
import { canAddEntity, canDelete, canManageEntity, canManageSchema } from "@/lib/permissions";
import { idField as schemaIdField, objectField } from "@/lib/schema";
import { api } from "@/services";
import { state } from "@/state";

const route = useRoute();
const router = useRouter();
const schemaName = String(route.params.schema);
const schema = ref<Schema | null>(null);
const idField = computed(() => (schema.value ? schemaIdField(schema.value) : "_id"));

const list = usePagedList<Entity>({
    endpoint: () => (schema.value ? api.entities(schemaName) : null),
    sort: () => idField.value
});

async function load(): Promise<void> {
    try {
        schema.value = await api.schemas.get(schemaName);
    } catch {
        void router.replace("/schemas");
    }
}

async function remove(entity: Entity): Promise<void> {
    if (await confirmDelete(schemaName, objectField(entity, idField.value))) {
        await list.remove(entity._id, "_id");
    }
}

void load();
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3>
            <strong>{{ schema?.name }}</strong> Information
            <small v-if="schema?.description">{{ schema.description }}</small>
        </h3>
        <div>
            <div><SchemaInformation v-if="schema" :schema="schema" /></div>
        </div>
    </div>
    <div class="row sisui-bottom-buffer">
        <h3>{{ schema?.name }} Entities</h3>
        <form class="form-inline" role="form" @submit.prevent>
            <FilterBox v-model="list.filterText.value" :error="list.filterError.value" @filter="list.filter" />
            <div class="form-group pull-right">
                <RouterLink v-show="schema && canManageSchema(state.user, schema)" :to="'/schemas/edit/' + schemaName">
                    <button type="button" class="btn btn-primary btn-sm">Edit Schema</button>
                </RouterLink>
                <RouterLink v-show="schema && canAddEntity(state.user, schema)" :to="'/entities/' + schemaName + '/add'">
                    <button type="button" class="btn btn-primary btn-sm">Add New</button>
                </RouterLink>
            </div>
        </form>
    </div>
    <div class="row">
        <table class="table table-bordered table-condensed table-striped">
            <thead>
                <tr>
                    <th>{{ schema ? idField : "" }}</th>
                    <th>Owners</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="entity in list.items.value" :key="entity._id">
                    <td><RouterLink :to="'/entities/' + schemaName + '/view/' + entity._id">{{ objectField(entity, idField) }}</RouterLink></td>
                    <td><OwnerLabels :owners="entity._sis?.owner" /></td>
                    <td>
                        <div class="pull-right">
                            <a v-show="!canManageEntity(state.user, entity, schema!)" class="btn btn-xs btn-default" disabled="disabled">
                                <span class="glyphicon glyphicon-lock"></span>
                            </a>
                            <RouterLink v-show="canManageEntity(state.user, entity, schema!)" class="btn btn-xs btn-primary" :to="'/entities/' + schemaName + '/edit/' + entity._id">
                                <span class="glyphicon glyphicon-edit"></span> Edit
                            </RouterLink>
                            <a v-show="canManageEntity(state.user, entity, schema!) && canDelete(entity)" href="" class="btn btn-xs btn-danger" @click.prevent="remove(entity)">
                                <span class="glyphicon glyphicon-trash"></span> Remove
                            </a>
                            <RouterLink v-show="schema && canAddEntity(state.user, schema)" class="btn btn-info btn-xs" :to="{ path: '/entities/' + schemaName + '/add', query: { clone: entity._id } }">
                                <span class="glyphicon glyphicon-retweet"></span> Clone
                            </RouterLink>
                            <RouterLink class="btn btn-info btn-xs" :to="'/commits/entities/' + schemaName + '/' + entity._id">
                                <span class="glyphicon glyphicon-list"></span> History
                            </RouterLink>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="row text-center">
            <ListPagination :page="list.page.value" :num-pages="list.numPages.value" @select="list.selectPage" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { confirmDelete } from "@/components/dialogs";
import OwnerLabels from "@/components/OwnerLabels.vue";
import type { Schema } from "@/lib/api/types";
import { canAddSchema, canDelete, canManageSchema } from "@/lib/permissions";
import { api } from "@/services";
import { state } from "@/state";

const schemas = ref<Schema[]>([]);
const filterText = ref("");

// filtered by name as the user types
const shown = computed(function() {
    const text = filterText.value.toLowerCase();
    return schemas.value.filter((s) => s.name.toLowerCase().includes(text));
});

async function load(): Promise<void> {
    try {
        schemas.value = await api.schemas.listAll({ sort: "name", with_counts: true });
    } catch {
        schemas.value = [];
    }
}

async function remove(schema: Schema): Promise<void> {
    if (await confirmDelete("schema", schema.name)) {
        await api.schemas.remove(schema.name);
        await load();
    }
}

void load();
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3>
            <strong>Schemas</strong>
        </h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <form class="form-inline" role="form" @submit.prevent>
            <div class="form-group">
                <label class="sr-only" for="filter">Filter</label>
                <input id="filter" v-model="filterText" type="text" class="form-control input-sm" placeholder="Filter">
            </div>
            <div class="form-group pull-right">
                <RouterLink v-show="canAddSchema(state.user)" to="/schemas/add">
                    <button type="button" class="btn btn-primary btn-sm">Add New</button>
                </RouterLink>
            </div>
        </form>
    </div>
    <div class="row">
        <table class="table table-bordered table-condensed table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Owners</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="schema in shown" :key="schema.name">
                    <td>
                        <RouterLink :to="'/entities/' + schema.name">{{ schema.name }}</RouterLink>
                        <span class="badge pull-right">{{ schema.entity_count }}</span>
                    </td>
                    <td>
                        <OwnerLabels :owners="schema._sis.owner" />
                    </td>
                    <td>
                        <a v-show="!canManageSchema(state.user, schema)" class="btn btn-xs btn-default" disabled="disabled">
                            <span class="glyphicon glyphicon-lock"></span>
                        </a>
                        <RouterLink v-show="canManageSchema(state.user, schema)" class="btn btn-xs btn-primary" :to="'/schemas/edit/' + schema.name">
                            <span class="glyphicon glyphicon-edit"></span> Edit
                        </RouterLink>
                        <a v-show="canManageSchema(state.user, schema) && canDelete(schema)" href="" class="btn btn-xs btn-danger" @click.prevent="remove(schema)">
                            <span class="glyphicon glyphicon-trash"></span> Remove
                        </a>
                        <RouterLink class="btn btn-info btn-xs" :to="'/commits/schemas/' + schema.name">
                            <span class="glyphicon glyphicon-list"></span> History
                        </RouterLink>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

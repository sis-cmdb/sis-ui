<script setup lang="ts">
import { confirmDelete } from "@/components/dialogs";
import FilterBox from "@/components/FilterBox.vue";
import ListPagination from "@/components/ListPagination.vue";
import OwnerLabels from "@/components/OwnerLabels.vue";
import { usePagedList } from "@/composables/usePagedList";
import type { Script } from "@/lib/api/types";
import { canAddHookOrScript, canDelete, canManageEntity } from "@/lib/permissions";
import { api } from "@/services";
import { state } from "@/state";

const list = usePagedList<Script>({ endpoint: () => api.scripts, sort: () => "name" });

async function remove(script: Script): Promise<void> {
    if (await confirmDelete("script", script.name)) {
        await list.remove(script.name, "name");
    }
}
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3>
            <strong>Scripts</strong>
        </h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <form class="form-inline" role="form" @submit.prevent>
            <FilterBox v-model="list.filterText.value" :error="list.filterError.value" @filter="list.filter" />
            <div class="form-group pull-right">
                <RouterLink v-show="canAddHookOrScript(state.user)" to="/scripts/add">
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
                    <th>Script Type</th>
                    <th>Owners</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="script in list.items.value" :key="script.name">
                    <td><RouterLink :to="'/scripts/view/' + script.name">{{ script.name }}</RouterLink></td>
                    <td>{{ script.script_type }}</td>
                    <td><OwnerLabels :owners="script._sis.owner" /></td>
                    <td>
                        <a v-show="!canManageEntity(state.user, script)" class="btn btn-xs btn-default" disabled="disabled">
                            <span class="glyphicon glyphicon-lock"></span>
                        </a>
                        <RouterLink v-show="canManageEntity(state.user, script)" class="btn btn-xs btn-primary" :to="'/scripts/edit/' + script.name">
                            <span class="glyphicon glyphicon-edit"></span> Edit
                        </RouterLink>
                        <a v-show="canManageEntity(state.user, script) && canDelete(script)" href="" class="btn btn-xs btn-danger" @click.prevent="remove(script)">
                            <span class="glyphicon glyphicon-trash"></span> Remove
                        </a>
                        <RouterLink class="btn btn-info btn-xs" :to="{ path: '/scripts/add', query: { clone: script.name } }">
                            <span class="glyphicon glyphicon-retweet"></span> Clone
                        </RouterLink>
                        <RouterLink class="btn btn-info btn-xs" :to="'/commits/scripts/' + script.name">
                            <span class="glyphicon glyphicon-list"></span> History
                        </RouterLink>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="row text-center">
            <ListPagination :page="list.page.value" :num-pages="list.numPages.value" @select="list.selectPage" />
        </div>
    </div>
</template>

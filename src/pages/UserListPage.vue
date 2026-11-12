<script setup lang="ts">
import FilterBox from "@/components/FilterBox.vue";
import ListPagination from "@/components/ListPagination.vue";
import { editUser, showSuperUsers, showUsersInGroup } from "@/components/dialogs/userDialogs";
import { usePagedList } from "@/composables/usePagedList";
import type { User } from "@/lib/api/types";
import { canManageUser } from "@/lib/permissions";
import { sortedEntries } from "@/lib/sorted";
import { api } from "@/services";
import { state } from "@/state";

const list = usePagedList<User>({ endpoint: () => api.users, sort: () => "name" });

async function edit(user: User): Promise<void> {
    const saved = await editUser(user);
    if (saved) {
        list.items.value = list.items.value.map((u) => (u.name === saved.name ? saved : u));
    }
}
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3>
            <strong>SIS Users</strong>
        </h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <form class="form-inline" role="form" @submit.prevent>
            <FilterBox v-model="list.filterText.value" :error="list.filterError.value" @filter="list.filter" />
        </form>
    </div>
    <div class="row">
        <table class="table table-bordered table-condensed table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Roles</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="user in list.items.value" :key="user.name">
                    <td>{{ user.name }}</td>
                    <td>
                        <template v-if="!user.super_user"><span v-for="[group, role] in sortedEntries(user.roles)" :key="group" style="margin-right: 1px;" class="label clickable" :class="{ 'label-default': role == 'user', 'label-primary': role == 'admin' }" :title="role" @click="showUsersInGroup(group)">{{ group }}</span></template>
                        <span v-if="user.super_user" class="clickable label label-success" @click="showSuperUsers()">Super User</span>
                    </td>
                    <td>
                        <a v-show="!canManageUser(state.user, user)" class="btn btn-xs btn-default" disabled="disabled">
                            <span class="glyphicon glyphicon-lock"></span>
                        </a>
                        <a v-show="canManageUser(state.user, user)" href="" class="btn btn-xs btn-primary" @click.prevent="edit(user)">
                            <span class="glyphicon glyphicon-edit"></span> Edit
                        </a>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="row text-center">
            <ListPagination :page="list.page.value" :num-pages="list.numPages.value" @select="list.selectPage" />
        </div>
    </div>
</template>

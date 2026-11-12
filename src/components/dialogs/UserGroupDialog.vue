<script setup lang="ts">
// The users matching a query, e.g. the members of a group.
import ListPagination from "@/components/ListPagination.vue";
import { usePagedList } from "@/composables/usePagedList";
import type { User } from "@/lib/api/types";
import type { Query } from "@/lib/query/parseSearch";
import { api } from "@/services";
import { sortedEntries } from "@/lib/sorted";

const props = defineProps<{ title: string; query: Query }>();
const emit = defineEmits<{ dismiss: [] }>();

const list = usePagedList<User>({ endpoint: () => api.users, sort: () => "name", query: props.query });
</script>

<template>
    <div>
        <div class="modal-header">
            <h3>{{ title }}</h3>
        </div>
        <div class="modal-body no-item-display">
            <div class="row sisui-bottom-buffer">
                <div>
                    <table class="table table-bordered table-condensed table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Roles</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="user in list.items.value" :key="user.name">
                                <td>{{ user.name }}</td>
                                <td>
                                    <template v-if="!user.super_user"><span v-for="[group, role] in sortedEntries(user.roles)" :key="group" style="margin-right: 1px;" class="label" :class="{ 'label-default': role == 'user', 'label-primary': role == 'admin' }" :title="role">{{ group }}</span></template>
                                    <span v-if="user.super_user" class="label label-success">Super User</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="container">
                        <ListPagination :page="list.page.value" :num-pages="list.numPages.value" @select="list.selectPage" />
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-warning" @click="emit('dismiss')">Close</button>
        </div>
    </div>
</template>

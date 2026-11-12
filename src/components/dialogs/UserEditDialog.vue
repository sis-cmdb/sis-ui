<script setup lang="ts">
// Edits a user's super user flag and group roles.
import { computed, reactive, ref } from "vue";
import type { Role, User } from "@/lib/api/types";
import { sortedEntries } from "@/lib/sorted";
import { adminGroups, canManageRole } from "@/lib/permissions";
import { api } from "@/services";
import { state } from "@/state";
import { showApiError } from ".";

const props = defineProps<{ user: User; action?: string }>();
const emit = defineEmits<{ close: [result: User]; dismiss: [] }>();

const ROLES: Role[] = ["user", "admin"];

const original = JSON.stringify({ ...props.user, roles: props.user.roles || {} });
const edited = reactive<User>(JSON.parse(original));
// new groups default to the "user" role
const newRole = reactive({ group: "", role: "user" as Role });
const saving = ref(false);

const isSuperUser = computed(() => adminGroups(state.user) === true);
// groups the editor administers that the user is not in yet
const otherGroups = computed(function() {
    const groups = adminGroups(state.user);
    return groups === true || !groups ? [] : groups.filter((g) => !edited.roles[g]);
});
const hasChanged = computed(() => JSON.stringify(edited) !== original);

function addRole(): void {
    if (newRole.role && newRole.group) {
        edited.roles[newRole.group] = newRole.role;
        newRole.group = "";
        newRole.role = "user";
    }
}

async function save(): Promise<void> {
    if (edited.super_user) {
        edited.roles = {};
    }
    saving.value = true;
    try {
        emit("close", await api.users.update(edited.name, edited));
    } catch (err) {
        await showApiError(err);
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div>
        <div class="modal-header">
            <h3>Edit permissions for {{ edited.name }}</h3>
        </div>
        <div class="modal-body no-item-display">
            <div role="form">
                <div class="checkbox">
                    <label>
                        <input v-model="edited.super_user" type="checkbox" :disabled="!isSuperUser"> Super User
                    </label>
                </div>
                <label>Groups</label>
                <ul v-if="!edited.super_user">
                    <li v-for="([group], index) in sortedEntries(edited.roles)" :key="group">
                        <div class="form-group">
                            <a href="" class="btn btn-xs btn-primary" :disabled="!canManageRole(state.user, group) || undefined" @click.prevent="delete edited.roles[group]">
                                <span class="glyphicon glyphicon-minus"></span>
                            </a>
                            <label :for="'role_' + index">{{ group }}</label>
                            <select :id="'role_' + index" v-model="edited.roles[group]" :disabled="!canManageRole(state.user, group)">
                                <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
                            </select>
                        </div>
                    </li>
                    <li v-for="(group, index) in otherGroups" :key="'new_' + group">
                        <div class="form-group">
                            <a href="" class="btn btn-xs btn-primary" @click.prevent="delete edited.roles[group]">
                                <span class="glyphicon glyphicon-minus"></span>
                            </a>
                            <label :for="'newrole_' + index">{{ group }}</label>
                            <select :id="'newrole_' + index" v-model="edited.roles[group]"><option value="" disabled hidden></option><option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option></select>
                        </div>
                    </li>
                    <li v-if="isSuperUser">
                        <div class="form-group">
                            <input v-model="newRole.group" aria-label="New group" placeholder="group">
                            <select v-model="newRole.role" aria-label="New group role">
                                <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
                            </select>
                            <a href="" class="btn btn-xs btn-primary" @click.prevent="addRole">
                                <span class="glyphicon glyphicon-plus"></span> Add
                            </a>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        <div v-if="action != 'view'" class="modal-footer">
            <button :disabled="!hasChanged || saving" class="btn btn-primary" @click="save">Save</button>
            <button class="btn btn-warning" @click="emit('dismiss')">Cancel</button>
        </div>
        <div v-if="action == 'view'" class="modal-footer">
            <button class="btn btn-warning" @click="emit('dismiss')">Close</button>
        </div>
    </div>
</template>

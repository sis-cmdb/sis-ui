<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { confirmDelete } from "@/components/dialogs";
import type { Token } from "@/lib/api/types";
import { expireTime } from "@/lib/format";
import { canAddToken } from "@/lib/permissions";
import { isSessionToken } from "@/lib/session";
import { api } from "@/services";
import { state } from "@/state";

interface TempToken extends Token {
    // the login session itself, which the API does not list
    session?: boolean;
}

const router = useRouter();
const user = state.user;
const temps = ref<TempToken[]>([]);
const persistent = ref<Token[]>([]);
const newToken = reactive({ desc: "" });

async function load(username: string, currentToken: string, expirationTime: number): Promise<void> {
    if (isSessionToken(currentToken)) {
        temps.value.push({ name: currentToken, session: true, expires: Math.max(expirationTime - Date.now(), 0) });
    }
    const tokens = await api.tokens(username).listAll();
    for (const token of tokens) {
        (token.expires !== undefined ? temps.value : persistent.value).push(token);
    }
}

if (!user) {
    void router.replace("/users");
} else {
    void load(user.username, user.token, user.expirationTime);
}

async function remove(token: Token, isTemp: boolean): Promise<void> {
    if (user && await confirmDelete("token", token.name)) {
        await api.tokens(user.username).remove(token.name);
        const items = isTemp ? temps : persistent;
        items.value = items.value.filter((t) => t.name !== token.name);
    }
}

async function addNew(): Promise<void> {
    if (!user || !newToken.desc) {
        return;
    }
    const created = await api.tokens(user.username).create({ desc: newToken.desc });
    newToken.desc = "";
    persistent.value.push(created);
}
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3>
            <strong>Tokens</strong>
        </h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <h4>Temporary Tokens</h4>
    </div>
    <div class="row sis-ui-bottom-buffer">
        <table class="table table-bordered table-condensed table-striped">
            <thead>
                <tr>
                    <th>Token</th>
                    <th>Expires in</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="token in temps" :key="token.name">
                    <td>{{ token.session ? 'Login session' : token.name }}</td>
                    <td>{{ expireTime(token.expires) }}</td>
                    <td>
                        <span v-if="token.name === user?.token" class="label label-primary">Current Token</span>
                        <a v-if="token.name !== user?.token" href="" class="btn btn-xs btn-danger" @click.prevent="remove(token, true)">
                            <span class="glyphicon glyphicon-trash"></span> Remove
                        </a>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="row sisui-bottom-buffer">
        <h4>Persistent Tokens</h4>
    </div>
    <div v-if="!canAddToken(user)" class="row">
        <strong>Super users or users without any roles cannot create persistent tokens yet.</strong>
    </div>
    <div v-if="canAddToken(user)" class="row sisui-bottom-buffer">
        <form class="form-inline" role="form" @submit.prevent>
            <div class="form-group">
                <input v-model="newToken.desc" aria-label="Description" type="text" class="form-control input-sm" placeholder="Description">
                <button type="button" class="btn btn-primary btn-sm" :disabled="!newToken.desc" @click="addNew">Add New</button>
            </div>
        </form>
    </div>
    <div v-if="persistent.length" class="row">
        <table class="table table-bordered table-condensed table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="token in persistent" :key="token.name">
                    <td>{{ token.name }}</td>
                    <td>{{ token.desc }}</td>
                    <td>
                        <a href="" class="btn btn-xs btn-danger" @click.prevent="remove(token, false)">
                            <span class="glyphicon glyphicon-trash"></span> Remove
                        </a>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

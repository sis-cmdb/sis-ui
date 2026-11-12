<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { goBack } from "@/router";
import { session } from "@/services";
import { state } from "@/state";

const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref(false);

if (state.user) {
    void router.replace("/schemas");
}

async function login(): Promise<void> {
    error.value = false;
    try {
        await session.login(username.value, password.value);
        goBack("/schemas");
    } catch {
        error.value = true;
    }
}
</script>

<template>
    <div class="row">
        <div class="col-md-offset-4 col-md-4">
            <form role="form" @submit.prevent>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input id="username" v-model="username" type="text" name="username" class="form-control" placeholder="Username" required :aria-invalid="!username">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input id="password" v-model="password" type="password" class="form-control" name="password" placeholder="Password" required :aria-invalid="!password" @keydown.enter.prevent="login">
                </div>
                <div v-if="error" class="has-warning has-feedback">
                    <label>Authentication failed.  Please try again.</label>
                </div>
                <button type="button" class="btn btn-default btn-block" @click="login">Login</button>
            </form>
        </div>
    </div>
</template>

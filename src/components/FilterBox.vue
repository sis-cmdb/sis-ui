<script setup lang="ts">
// The filter box of a list: a query (see the filter reference) applied with
// the button or Enter.
import { showFilterHelp } from "./dialogs";

const text = defineModel<string>({ required: true });
defineProps<{ error: string; inputId?: string }>();
const emit = defineEmits<{ filter: [text: string] }>();
</script>

<template>
    <div class="form-group">
        <label class="sr-only" :for="inputId || 'filter'">Filter</label>
        <input :id="inputId || 'filter'" v-model="text" type="text" class="form-control input-sm" placeholder="Filter" @keydown.enter.prevent="emit('filter', text)">
        <button type="button" class="btn btn-primary btn-sm" @click="emit('filter', text)">Filter</button>
        <span class="glyphicon glyphicon-question-sign" @click="showFilterHelp()"></span>
        <small v-if="error">{{ error }}</small>
    </div>
</template>

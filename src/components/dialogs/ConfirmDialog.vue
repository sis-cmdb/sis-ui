<script setup lang="ts">
defineProps<{ title: string; body: string }>();
const emit = defineEmits<{ close: [result: true]; dismiss: [] }>();
</script>

<template>
    <div>
        <div class="modal-header">
            <h3>{{ title }}</h3>
        </div>
        <div class="modal-body no-item-display">
            <p>{{ body }}</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-warning" @click="emit('dismiss')">Cancel</button>
            <button class="btn btn-primary" @click="emit('close', true)">Confirm</button>
        </div>
    </div>
</template>

<script setup lang="ts">
// A field of a schema as labels (name, type, reference, required, unique),
// with its fields below.
import type { FieldDescriptor } from "@/lib/schema";

defineProps<{ field: FieldDescriptor }>();
</script>

<template>
    <label class="label label-default">{{ field.name }}</label>
    <label class="label label-success">{{ field.type }}</label>
    <RouterLink v-if="field.ref" :to="'/entities/' + field.ref">
        <label class="label label-warning add-pointer">{{ field.ref }}</label>
    </RouterLink>
    <label v-show="field.required" class="label label-primary">required</label>
    <label v-show="field.unique" class="label label-info">unique</label>
    <ul v-show="field.children">
        <li v-for="child in field.children" :key="child.name ?? ''"><SchemaFieldsSummary :field="child" /></li>
    </ul>
</template>

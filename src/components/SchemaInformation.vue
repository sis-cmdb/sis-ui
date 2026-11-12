<script setup lang="ts">
// A schema's fields, JSON and administrators (above its entity list).
import { computed, ref, watch } from "vue";
import type { Schema, User } from "@/lib/api/types";
import { describeFields } from "@/lib/schema";
import { api } from "@/services";
import AccordionGroup from "./AccordionGroup.vue";
import SchemaFieldsSummary from "./SchemaFieldsSummary.vue";
import SisAccordion from "./SisAccordion.vue";

const props = defineProps<{ schema: Schema }>();

const fields = computed(() => describeFields(props.schema.definition));
const admins = ref<User[]>([]);

// super users and the administrators of every owner group
watch(() => props.schema, async function(schema) {
    const owners: Record<string, string> = {};
    for (const owner of schema._sis.owner || []) {
        owners["roles." + owner] = "admin";
    }
    try {
        admins.value = await api.users.listAll({ q: { $or: [{ super_user: true }, owners] } });
    } catch {
        admins.value = [];
    }
}, { immediate: true });
</script>

<template>
    <SisAccordion>
        <AccordionGroup heading="Definition Fields">
            <ul class="list-unstyled">
                <li v-for="field in fields" :key="field.name"><SchemaFieldsSummary :field="field" /></li>
            </ul>
        </AccordionGroup>
        <AccordionGroup heading="JSON">
            <pre>
{{ JSON.stringify(schema, null, 2) }}
        </pre>
        </AccordionGroup>
        <AccordionGroup heading="Admins">
            <table class="table table-bordered table-condensed table-striped">
                <thead>
                    <tr>
                        <th><strong>username</strong></th>
                        <th><strong>email</strong></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in admins" :key="user.name">
                        <td>{{ user.name }}</td>
                        <td><a :href="'mailto:' + user.email">{{ user.email }}</a></td>
                    </tr>
                </tbody>
            </table>
        </AccordionGroup>
    </SisAccordion>
</template>

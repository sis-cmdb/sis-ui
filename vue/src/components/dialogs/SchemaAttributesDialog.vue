<script setup lang="ts">
// Edits the attributes of a schema field (required, enum, min, ref, ...).
// Closes with the attributes.
import { computed, reactive } from "vue";
import { toRegex, validationMessage } from "@/lib/format";
import { attributesForType, type Attribute } from "@/lib/schema";
import type { SchemaField } from "@/lib/schemaForm";

const props = defineProps<{ field: SchemaField; schemaNames: string[] }>();
const emit = defineEmits<{ close: [result: Record<string, unknown>]; dismiss: [] }>();

const attributes = attributesForType(props.field.type);
const values = reactive<Record<string, unknown>>({});
for (const { name } of attributes) {
    if (props.field.attrs[name] !== undefined) {
        values[name] = props.field.attrs[name];
    }
}

// what the text inputs hold, as typed; lists start as "a, b"
const texts = reactive<Record<string, string>>({});
for (const { name } of attributes) {
    const value = values[name];
    texts[name] = Array.isArray(value) ? value.join(", ") : value === undefined || value === null ? "" : String(value);
}

const errors = computed(function() {
    const result: Record<string, Record<string, boolean>> = {};
    const match = values.match;
    if (typeof match === "string" && match && !toRegex(match)) {
        result.match = { regex: true };
    }
    const { min, max } = values;
    if (typeof min === "number" && typeof max === "number" && min > max) {
        result.min = { minVal: true };
        result.max = { maxVal: true };
    }
    return result;
});
const valid = computed(() => !Object.keys(errors.value).length);

function onInput(attribute: Attribute, input: string): void {
    texts[attribute.name] = input;
    if (attribute.input === "number") {
        values[attribute.name] = input === "" ? null : parseFloat(input);
    } else if (attribute.input === "textArray") {
        // ng-list: comma separated
        values[attribute.name] = input.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
        values[attribute.name] = input.trim();
    }
}

function ok(): void {
    const result: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(values)) {
        if (value || value === 0) {
            result[name] = value;
        }
    }
    emit("close", result);
}
</script>

<template>
    <div>
        <div class="modal-header">
            <h3><b>{{ field.name }}</b> Attributes</h3>
        </div>
        <div class="modal-body no-item-display">
            <div class="row">
                <div v-for="attribute in attributes" :key="attribute.name" class="form-group">
                    <label class="entity-label control-label" :for="'attr_' + attribute.name">{{ attribute.name }}</label>
                    <span><select v-if="attribute.input === 'select'" :id="'attr_' + attribute.name" :aria-describedby="'attr_' + attribute.name + '_error'" :value="values[attribute.name] ?? ''" @change="values[attribute.name] = ($event.target as HTMLSelectElement).value"><option v-if="!values[attribute.name]" value=""></option><option v-for="name in schemaNames" :key="name" :value="name">{{ name }}</option></select><input v-else-if="attribute.input === 'checkbox'" :id="'attr_' + attribute.name" type="checkbox" class="" :aria-describedby="'attr_' + attribute.name + '_error'" :checked="values[attribute.name] === true" @change="values[attribute.name] = ($event.target as HTMLInputElement).checked"><input v-else :id="'attr_' + attribute.name" :type="attribute.input === 'number' ? 'number' : 'text'" class="input-sm" :aria-describedby="'attr_' + attribute.name + '_error'" :aria-invalid="!!errors[attribute.name]" :value="texts[attribute.name]" @input="onInput(attribute, ($event.target as HTMLInputElement).value)"></span>
                    <small v-if="errors[attribute.name]" :id="'attr_' + attribute.name + '_error'" style="margin-left: 4px;">{{ validationMessage(errors[attribute.name]) }}</small>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-warning" @click="emit('dismiss')">Cancel</button>
            <button :disabled="!valid" class="btn btn-warning" @click="ok">Ok</button>
        </div>
    </div>
</template>

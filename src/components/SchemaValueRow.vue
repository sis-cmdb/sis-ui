<script setup lang="ts">
// A field of the schema itself on the schema form (name, description, ...,
// and the SIS fields): a label with an input, or with checkboxes for a choice
// of owners.
import { computed, ref, watch } from "vue";
import { useFieldValidity } from "@/composables/useFormValidity";
import { checkInput } from "@/lib/entityForm";
import { uniqueId } from "@/lib/ids";
import { inputType, type FieldDescriptor } from "@/lib/schema";

export interface ValueField extends FieldDescriptor {
    name: string;
    readonly?: boolean;
    match?: string;
    // owner: the groups to pick from
    enum?: string[];
}

const props = defineProps<{
    field: ValueField;
    // the current value
    value: unknown;
    // what the input starts with, instead of the value (e.g. after Lock All)
    initialText?: string;
    width: string;
}>();
const emit = defineEmits<{ change: [value: unknown]; toggle: [choice: string] }>();

const inputId = uniqueId("schema");
const reportValidity = useFieldValidity();

function shown(value: unknown): unknown {
    return Array.isArray(value) && props.field.type !== "Array" ? value.join(",") : value;
}

const display = ref(props.initialText ?? shown(props.value));
const errors = ref(checkInput(props.field, display.value).errors);
watch(errors, (e) => reportValidity(!Object.keys(e).length), { immediate: true });

const valid = computed(() => !Object.keys(errors.value).length);

function onInput(input: unknown): void {
    display.value = input;
    const checked = checkInput(props.field, input);
    errors.value = checked.errors;
    emit("change", checked.value);
}
</script>

<template>
    <div>
        <div>
            <label class="schema-label" :style="{ width }" :for="inputId">{{ field.name }}</label>
            <div v-if="field.enum">
                <ul>
                    <li>
                        <fieldset>
                            <label v-for="choice in field.enum" :key="choice">
                                <input type="checkbox"
                                       :checked="Array.isArray(value) && value.includes(choice)"
                                       @click="emit('toggle', choice)"> {{ choice }}
                            </label>
                        </fieldset>
                    </li>
                </ul>
            </div>
            <input v-if="!field.enum && inputType(field.type) === 'checkbox'" :id="inputId" type="checkbox" :placeholder="field.type" :checked="display === true" :disabled="field.readonly" :required="field.required" :aria-invalid="!valid" @change="onInput(($event.target as HTMLInputElement).checked)"/>
            <input v-else-if="!field.enum" :id="inputId" :type="inputType(field.type)" :placeholder="field.type" :value="display ?? ''" :disabled="field.readonly" :required="field.required" :aria-invalid="!valid" @input="onInput(($event.target as HTMLInputElement).value)"/>
        </div>
    </div>
</template>

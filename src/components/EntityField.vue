<script setup lang="ts">
// A field of the entity form (entities, hooks and scripts), with the markup of
// the AngularJS entity-descriptor.html: documents and arrays as collapsible
// groups of fields, other fields as an input with a label and its error.
import { computed, ref, watch } from "vue";
import { openDialog } from "@/dialogs";
import { useFieldValidity } from "@/composables/useFormValidity";
import type { Entity, Schema } from "@/lib/api/types";
import { checkInput, displayValue, isCode, isReference, ITEM_LABEL_LENGTH, maxNameLength, storedValue,
         type FormAction } from "@/lib/entityForm";
import { labelWidth, validationMessage } from "@/lib/format";
import { uniqueId } from "@/lib/ids";
import { idField as schemaIdField, inputType, newValue, objectField, type FieldDescriptor } from "@/lib/schema";
import { api } from "@/services";
import CodeEditorDialog from "./dialogs/CodeEditorDialog.vue";
import EntityChooserDialog from "./dialogs/EntityChooserDialog.vue";

type Container = Record<string, unknown> | unknown[];

const props = defineProps<{
    field: FieldDescriptor;
    // the object (or array) holding the field's value, at fieldKey
    container: Container;
    fieldKey: string | number;
    // dotted path, e.g. "_sis.owner"
    path: string;
    action: FormAction;
    // css width of the label (or header) column
    width: string;
    // the whole object, for the code editor
    entity: Record<string, unknown>;
    // an item of an array: labelled with its index and can be removed
    isItem?: boolean;
}>();
const emit = defineEmits<{ remove: [] }>();

const inputId = uniqueId("field");
const fieldName = computed(() => String(props.fieldKey));
const readOnly = computed(() => props.action === "view" && !isCode(props.field));
const canDelete = computed(() => props.action !== "view" && !!props.isItem);
const collapsed = ref(false);

function value(): unknown {
    return (props.container as Record<string | number, unknown>)[props.fieldKey];
}

function setValue(v: unknown): void {
    (props.container as Record<string | number, unknown>)[props.fieldKey] = v;
}

// documents and arrays
const children = computed(() => props.field.children || []);
const childWidth = computed(() => labelWidth(maxNameLength(children.value, props.action)));
// re-creates the items when their number changes, as AngularJS did
const version = ref(0);

// documents in arrays, and every item on the view page, line up with the array
function itemWidth(item: FieldDescriptor): string {
    const container = item.type === "Document" || item.type === "Array";
    return container || props.action === "view" ? props.width : labelWidth(ITEM_LABEL_LENGTH);
}

function addItem(): void {
    (value() as unknown[]).push(newValue(children.value[0]!));
    version.value++;
}

function removeItem(index: number): void {
    (value() as unknown[]).splice(index, 1);
    version.value++;
}

function toggleChoice(choice: unknown): void {
    const list = value() as unknown[];
    const index = list.indexOf(choice);
    if (index === -1) {
        list.push(choice);
    } else {
        list.splice(index, 1);
    }
}

// other fields: what the input shows and its validity
const display = ref(displayValue(props.field, value(), props.path));
const errors = ref<Record<string, boolean>>({});
const reportValidity = useFieldValidity();
const isLeaf = props.field.type !== "Document" && props.field.type !== "Array";

function check(input: unknown): unknown {
    const result = checkInput(props.field, input);
    errors.value = result.errors;
    return result.value;
}

if (isLeaf) {
    check(display.value);
    watch(errors, (e) => reportValidity(!Object.keys(e).length), { immediate: true });
}

const valid = computed(() => !Object.keys(errors.value).length);
const errorMessage = computed(() => validationMessage(errors.value, props.field as never));

function onInput(input: unknown): void {
    display.value = input;
    const checked = check(input);
    setValue(checked === undefined ? undefined : storedValue(props.field, checked, props.path));
}

// references: shown by the referenced entity's id field, stored by its _id
const refSchema = ref<Schema | null>(null);
const refIdField = ref("_id");
const refId = ref<string | null>(null);

function setReference(id: string | null): void {
    refId.value = id;
    setValue(id);
}

async function loadReference(): Promise<void> {
    const schema = await api.schemas.get(props.field.ref!);
    refSchema.value = schema;
    refIdField.value = schemaIdField(schema);
    const current = value() as { _id?: string } | string | null;
    if (!current) {
        return;
    }
    const id = typeof current === "object" ? current._id! : current;
    setReference(id);
    try {
        const entity = await api.entities(schema.name).get(id);
        display.value = objectField(entity, refIdField.value);
        check(display.value);
        setReference(entity._id);
    } catch {
        display.value = null;
        check(null);
        setReference(null);
    }
}

// a click on Choose waits for this
const referenceLoaded = isReference(props.field) ? loadReference().catch(() => undefined) : Promise.resolve();

async function chooseEntity(): Promise<void> {
    await referenceLoaded;
    if (!refSchema.value) {
        return;
    }
    const chosen = await openDialog<Entity | null>(EntityChooserDialog, { schema: refSchema.value, idField: refIdField.value });
    if (chosen === undefined) {
        return;
    }
    display.value = chosen ? chosen[refIdField.value] : null;
    check(display.value);
    setReference(chosen ? chosen._id : null);
}

async function openEditor(): Promise<void> {
    const code = await openDialog(CodeEditorDialog, {
        field: props.field,
        code: display.value,
        readOnly: props.action === "view",
        entity: props.entity
    }, { windowClass: "editor-modal-window", keyboard: false, backdrop: "static" });
    if (code !== undefined) {
        display.value = code;
        check(code);
        setValue(storedValue(props.field, code, props.path));
    }
}

const bounds = computed(() => ({
    min: typeof props.field.min === "number" ? props.field.min : undefined,
    max: typeof props.field.max === "number" ? props.field.max : undefined
}));

const placeholder = computed(() => isReference(props.field) ? "ObjectId (" + props.field.ref + ")"
    : String(props.field.comment || props.field.type));
</script>

<template>
    <div>
        <div v-if="field.type === 'Document'" role="group" :aria-labelledby="inputId + '_label'">
            <div :style="{ width }">
                <a v-show="canDelete" href="" class="btn btn-xs btn-primary" @click.prevent="emit('remove')">
                    <span class="glyphicon glyphicon-minus"></span>
                </a>
                <a href="" class="btn btn-xs btn-default collapse-btn pull-left" @click.prevent="collapsed = !collapsed">
                    <span v-show="collapsed" class="glyphicon glyphicon-chevron-right"></span>
                    <span v-show="!collapsed" class="glyphicon glyphicon-chevron-down"></span>
                </a>
                <label :id="inputId + '_label'" class="pull-right">{{ fieldName }}</label>
                <br style="clear: both;"/>
            </div>
            <ul class="collapse" :class="{ in: !collapsed }" :style="{ height: collapsed ? '0px' : 'auto' }">
                <li v-for="child in children" :key="child.name">
                    <div><EntityField :field="child" :container="value() as Container" :field-key="child.name!" :path="path + '.' + child.name" :action="action" :width="childWidth" :entity="entity" /></div>
                </li>
            </ul>
        </div>
        <div v-else-if="field.type === 'Array'" role="group" :aria-labelledby="inputId + '_label'">
            <div :style="{ width }">
                <a v-show="canDelete" href="" class="btn btn-xs btn-primary" @click.prevent="emit('remove')">
                    <span class="glyphicon glyphicon-minus"></span>
                </a>
                <a href="" class="btn btn-xs btn-default collapse-btn pull-left" @click.prevent="collapsed = !collapsed">
                    <span v-show="collapsed" class="glyphicon glyphicon-chevron-right"></span>
                    <span v-show="!collapsed" class="glyphicon glyphicon-chevron-down"></span>
                </a>
                <label :id="inputId + '_label'" class="pull-right">{{ fieldName }}</label>
                <br style="clear: both;"/>
            </div>
            <div v-if="field.enum">
                <ul class="collapse" :class="{ in: !collapsed }" :style="{ height: collapsed ? '0px' : 'auto' }">
                    <li>
                        <fieldset :disabled="readOnly">
                            <div v-for="(choice, index) in field.enum" :key="String(choice)">
                                <input :id="inputId + '_' + index" type="checkbox"
                                       :checked="(value() as unknown[]).indexOf(choice) >= 0"
                                       @click="toggleChoice(choice)">
                                <label style="margin-left: 4px;" :for="inputId + '_' + index">{{ choice }}</label>
                            </div>
                        </fieldset>
                    </li>
                </ul>
            </div>
            <div v-if="!field.enum">
                <ul class="collapse" :class="{ in: !collapsed }" :style="{ height: collapsed ? '0px' : 'auto' }">
                    <li v-for="(_item, index) in (value() as unknown[])" :key="version + '-' + index">
                        <div><EntityField :field="children[0]!" :container="value() as Container" :field-key="index" :path="path + '.' + index" :action="action" :width="itemWidth(children[0]!)" :entity="entity" is-item @remove="removeItem(index)" /></div>
                    </li>
                    <li>
                        <a v-show="action !== 'view' && Array.isArray(value())" href="" class="btn btn-xs btn-primary" @click.prevent="addItem">
                            <span class="glyphicon glyphicon-plus"></span> Add
                        </a>
                    </li>
                </ul>
            </div>
        </div>
        <div v-else class="form-group" :class="{ 'has-error': !valid }">
            <fieldset :disabled="readOnly">
                <a v-show="canDelete" href="" class="btn btn-xs btn-primary" @click.prevent="emit('remove')">
                    <span class="glyphicon glyphicon-minus"></span>
                </a>
                <label :style="{ width }" class="entity-label" :for="inputId">{{ fieldName }}</label>
                <span class="entity-input"><select v-if="field.enum" :id="inputId" class="form-control input-sm" :required="!!field.required" :aria-describedby="inputId + '_error'" :aria-invalid="!valid" :value="display" @change="onInput(field.enum[($event.target as HTMLSelectElement).selectedIndex])"><option v-for="choice in field.enum" :key="String(choice)" :value="choice" :selected="choice === display">{{ choice }}</option></select><template v-else-if="isCode(field)"><input :id="inputId" type="hidden" class="form-control input-sm" :required="!!field.required" :aria-describedby="inputId + '_error'" :aria-invalid="!valid" :placeholder="placeholder"><a href="" class="btn btn-sm btn-primary" @click.prevent="openEditor">Open Editor</a></template><input v-else-if="inputType(field.type) === 'checkbox'" :id="inputId" type="checkbox" class="form-control input-sm" :required="!!field.required" :aria-describedby="inputId + '_error'" :aria-invalid="!valid" :placeholder="placeholder" :checked="display === true" @change="onInput(($event.target as HTMLInputElement).checked)"><input v-else :id="inputId" :type="inputType(field.type)" class="form-control input-sm" :required="!!field.required" :aria-describedby="inputId + '_error'" :aria-invalid="!valid" :min="bounds.min" :max="bounds.max" :disabled="isReference(field)" :placeholder="placeholder" :value="display ?? ''" @input="onInput(($event.target as HTMLInputElement).value)"></span>
                <button v-if="isReference(field) && !readOnly" type="button" style="margin-left: 4px;" class="btn btn-sm btn-info" @click="chooseEntity">Choose</button>
                <RouterLink v-if="refId" :to="'/entities/' + field.ref + '/view/' + refId">View</RouterLink>
                <div v-if="!valid">
                    <label :style="{ width }" class="entity-label" aria-hidden="true"></label>
                    <small :id="inputId + '_error'" style="margin-left: 4px;">{{ errorMessage }}</small>
                </div>
            </fieldset>
        </div>
    </div>
</template>

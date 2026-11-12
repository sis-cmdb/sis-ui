// Whether every field of a form is valid: the fields report their validity to
// the page that provides the form.

import { computed, inject, onBeforeUnmount, provide, reactive, type ComputedRef, type InjectionKey } from "vue";

const FORM: InjectionKey<Map<symbol, boolean>> = Symbol("form validity");

// on the page: true while no field reports an error
export function provideFormValidity(): ComputedRef<boolean> {
    const fields = reactive(new Map<symbol, boolean>());
    provide(FORM, fields);
    return computed(() => [...fields.values()].every(Boolean));
}

// in a field: returns the function that reports its validity
export function useFieldValidity(): (valid: boolean) => void {
    const fields = inject(FORM, null);
    const id = Symbol("field");
    onBeforeUnmount(() => fields?.delete(id));
    return (valid) => fields?.set(id, valid);
}

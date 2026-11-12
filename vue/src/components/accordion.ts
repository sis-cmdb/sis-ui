import type { InjectionKey, Ref } from "vue";

// the open group of a SisAccordion
export const ACCORDION: InjectionKey<Ref<symbol | null>> = Symbol("accordion");

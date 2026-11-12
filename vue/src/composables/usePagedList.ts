// A page of objects from an API list endpoint, with the filter box (port of the
// AngularJS EndpointPager). By default the filter and page are kept in the url
// (?q=<filter text>&p=<page>), so they survive reloads and back/forward.

import { computed, ref, shallowRef, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Endpoint } from "@/lib/api/client";
import { parseSearch, type Query } from "@/lib/query/parseSearch";

export const PAGE_SIZE = 20;

export interface PagedListOptions<T> {
    // null until the endpoint is known (e.g. after loading the schema)
    endpoint: () => Endpoint<T> | null;
    sort?: () => string | undefined;
    // a fixed query instead of the filter box
    query?: Query;
    // keep the filter and page in the url (default: true without a fixed query)
    url?: boolean;
}

export interface PagedList<T> {
    items: Ref<T[]>;
    page: Ref<number>;
    numPages: Ref<number>;
    // the filter box text and why it was rejected
    filterText: Ref<string>;
    filterError: Ref<string>;
    filter(text: string): void;
    selectPage(page: number): void;
    remove(id: string, idField: keyof T): Promise<void>;
    reload(): void;
}

function single(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function usePagedList<T>(options: PagedListOptions<T>): PagedList<T> {
    const route = useRoute();
    const router = useRouter();
    const useUrl = options.url ?? !options.query;
    const path = route.path;

    const items = shallowRef<T[]>([]) as Ref<T[]>;
    const numPages = ref(0);
    const filterError = ref("");
    // without the url: the page and the applied filter text
    const localPage = ref(1);
    const localSearch = ref("");

    const search = computed(() => useUrl ? single(route.query.q) : localSearch.value);
    const page = computed(function() {
        const p = useUrl ? parseInt(single(route.query.p), 10) : localPage.value;
        return isNaN(p) || p < 1 ? 1 : p;
    });
    const filterText = ref(search.value);

    let requestId = 0;
    async function load(): Promise<void> {
        const endpoint = options.endpoint();
        if (!endpoint) {
            return;
        }
        const id = ++requestId;
        const query = options.query || parseSearch(search.value);
        try {
            const result = await endpoint.list({
                limit: PAGE_SIZE,
                offset: (page.value - 1) * PAGE_SIZE,
                sort: options.sort?.(),
                q: query && Object.keys(query).length ? query : undefined
            });
            // a later request supersedes this one
            if (id === requestId) {
                items.value = result.results;
                numPages.value = Math.ceil(result.totalCount / PAGE_SIZE);
            }
        } catch {
            if (id === requestId) {
                items.value = [];
                numPages.value = 0;
            }
        }
    }

    // reload when the endpoint becomes known or the url's filter or page changes
    // (while this page is shown)
    watch([() => options.endpoint(), search, page], function() {
        if (!useUrl || route.path === path) {
            filterText.value = search.value;
            void load();
        }
    }, { immediate: true });

    function navigate(q: string | null, p: number): void {
        if (!useUrl) {
            localSearch.value = q || "";
            localPage.value = p;
            return;
        }
        const query = { ...route.query, q: q || undefined, p: String(p) };
        if (single(route.query.q) === (q || "") && single(route.query.p) === String(p)) {
            // the same url: the user asked to filter again
            void load();
        } else {
            void router.push({ query });
        }
    }

    return {
        items,
        page,
        numPages,
        filterText,
        filterError,
        filter(text: string) {
            filterError.value = "";
            if (!text) {
                // turn the filter off (if there was one)
                if (search.value) {
                    navigate(null, 1);
                }
                return;
            }
            if (!parseSearch(text)) {
                filterError.value = "Invalid query.";
                return;
            }
            navigate(text, 1);
        },
        selectPage(p: number) {
            if (p > 0 && p <= numPages.value && p !== page.value) {
                navigate(search.value || null, p);
            }
        },
        async remove(id: string, idField: keyof T) {
            const endpoint = options.endpoint();
            if (!endpoint) {
                return;
            }
            await endpoint.remove(id);
            items.value = items.value.filter((item) => String(item[idField]) !== id);
        },
        reload() {
            void load();
        }
    };
}

<script setup lang="ts">
// The change history of a schema, entity, hook or script.
import { format as formatDelta } from "jsondiffpatch/formatters/html";
import { ref, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import AccordionGroup from "@/components/AccordionGroup.vue";
import ListPagination from "@/components/ListPagination.vue";
import SisAccordion from "@/components/SisAccordion.vue";
import { usePagedList } from "@/composables/usePagedList";
import type { Endpoint } from "@/lib/api/client";
import type { Commit } from "@/lib/api/types";
import { escapeHtml, fromNow, shortDateTime } from "@/lib/format";
import { api } from "@/services";

const SUPPORTED_TYPES = ["schemas", "hooks", "scripts", "hiera"] as const;

const route = useRoute();
const router = useRouter();
// read once: loading continues after the user may have navigated away
const params = { ...route.params };
const routeName = route.name;
const id = String(params.id);
const title = ref("");
const endpoint = shallowRef<Endpoint<Commit> | null>(null);

const list = usePagedList<Commit>({ endpoint: () => endpoint.value, sort: () => "date_modified", url: false });

async function setup(): Promise<void> {
    if (routeName === "entity-commits") {
        const schemaName = String(params.schema);
        try {
            await api.schemas.get(schemaName);
        } catch {
            void router.replace("/schemas");
            return;
        }
        title.value = "Commits for " + schemaName + " " + id;
        endpoint.value = api.entities(schemaName).commits(id);
        return;
    }
    const type = String(params.type) as (typeof SUPPORTED_TYPES)[number];
    if (!SUPPORTED_TYPES.includes(type)) {
        void router.replace("/schemas");
        return;
    }
    title.value = "Commits for " + type + " " + id;
    endpoint.value = api[type].commits(id);
}

// the inserted or deleted object, or what an update changed; the formatter
// escapes keys and values
function diffHtml(commit: Commit): string {
    if (commit.action === "insert" || commit.action === "delete") {
        return "<pre>" + escapeHtml(JSON.stringify(commit.commit_data, null, 2)) + "</pre>";
    }
    const delta = { ...((commit.commit_data || commit.diff || {}) as Record<string, unknown>) };
    for (const key of Object.keys(delta)) {
        if (key[0] === "_") {
            delete delta[key];
        }
    }
    return formatDelta(delta as never) || "";
}

void setup();
</script>

<template>
    <div class="row sisui-bottom-buffer">
        <h3>
            <strong>{{ title }}</strong>
        </h3>
    </div>
    <div class="row sisui-bottom-buffer">
        <SisAccordion>
            <AccordionGroup v-for="commit in list.items.value" :key="commit._id">
                <template #heading>
                    <i v-if="commit.action == 'insert'" class="glyphicon glyphicon-plus"></i>
                    <i v-if="commit.action == 'delete'" class="glyphicon glyphicon-minus"></i>
                    {{ shortDateTime(commit.date_modified) }}
                    <small>{{ fromNow(commit.date_modified) }}</small>
                    <span class="pull-right">{{ commit.modified_by }}</span>
                </template>
                <div>
                    <div v-html="diffHtml(commit)"></div>
                </div>
            </AccordionGroup>
        </SisAccordion>
        <div class="row text-center">
            <ListPagination :page="list.page.value" :num-pages="list.numPages.value" @select="list.selectPage" />
        </div>
    </div>
</template>

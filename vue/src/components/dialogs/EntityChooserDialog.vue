<script setup lang="ts">
// Picks an entity of a schema for a reference field. Closes with the entity,
// or null for "Clear Choice".
import FilterBox from "@/components/FilterBox.vue";
import ListPagination from "@/components/ListPagination.vue";
import { usePagedList } from "@/composables/usePagedList";
import type { Entity, Schema } from "@/lib/api/types";
import { api } from "@/services";

const props = defineProps<{ schema: Schema; idField: string }>();
const emit = defineEmits<{ close: [result: Entity | null]; dismiss: [] }>();

const list = usePagedList<Entity>({ endpoint: () => api.entities(props.schema.name), sort: () => props.idField, url: false });
</script>

<template>
    <div>
        <div class="modal-header">
            <h3>Choose an entity of type {{ schema.name }}</h3>
        </div>
        <div class="modal-body no-item-display">
            <div class="row sisui-bottom-buffer">
                <form class="form-inline" role="form" @submit.prevent>
                    <FilterBox v-model="list.filterText.value" :error="list.filterError.value" input-id="chooser-filter" @filter="list.filter" />
                    <div class="form-group pull-right">
                        <button type="button" class="btn btn-info btn-sm" @click="emit('close', null)">Clear Choice</button>
                    </div>
                </form>
            </div>
            <div class="row sisui-bottom-buffer">
                <table class="table table-bordered table-condensed table-striped">
                    <thead>
                        <tr>
                            <th>{{ idField }}</th>
                            <th>Owners</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="entity in list.items.value" :key="entity._id">
                            <td>{{ entity[idField] }}</td>
                            <td><span v-for="owner in entity._sis?.owner" :key="owner" style="margin-right: 1px;" class="label label-default">{{ owner }}</span></td>
                            <td>
                                <a href="" class="btn btn-xs btn-success" @click.prevent="emit('close', entity)">
                                    <span class="glyphicon glyphicon-ok"></span> Select
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="row text-center">
                    <ListPagination :page="list.page.value" :num-pages="list.numPages.value" @select="list.selectPage" />
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-warning" @click="emit('dismiss')">Cancel</button>
        </div>
    </div>
</template>

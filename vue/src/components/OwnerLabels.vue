<script setup lang="ts">
// An object's owner groups; a click lists the group's users.
import { showUsersInGroup } from "./dialogs/userDialogs";

defineProps<{ owners: string[] | undefined }>();
</script>

<template><span v-for="owner in owners" :key="owner" style="margin-right: 1px;" class="label label-default clickable" @click="showUsersInGroup(owner)">{{ owner }}</span></template>

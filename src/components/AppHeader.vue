<script setup lang="ts">
import { docs } from "virtual:sis-docs";
import { useRoute } from "vue-router";
import { useDropdown } from "@/composables/useDropdown";
import { setTheme, THEMES } from "@/state";
import UserMenu from "./UserMenu.vue";

const route = useRoute();
const docsMenu = useDropdown();
const themeMenu = useDropdown();
</script>

<template>
    <header class="navbar navbar-default navbar-static-top">
        <div class="container">
            <div class="navbar-header"><RouterLink to="/schemas" class="navbar-brand">SIS</RouterLink></div>
            <div class="collapse navbar-collapse">
                <ul class="nav navbar-nav">
                    <li v-if="docs.length" class="dropdown" :class="{ active: route.name === 'docs', open: docsMenu.open.value }">
                        <a href="" class="dropdown-toggle" aria-haspopup="true" :aria-expanded="docsMenu.open.value" @click="docsMenu.toggle">Docs <span class="caret"></span></a>
                        <ul class="dropdown-menu" role="menu"><li v-for="doc in docs" :key="doc.name"><RouterLink :to="'/docs/' + doc.name">{{ doc.title }}</RouterLink></li>
                        </ul>
                    </li>
                    <li class="dropdown" :class="{ open: themeMenu.open.value }">
                        <a href="" class="dropdown-toggle" aria-haspopup="true" :aria-expanded="themeMenu.open.value" @click="themeMenu.toggle">Theme <span class="caret"></span></a>
                        <ul class="dropdown-menu" role="menu">
                            <li v-for="theme in THEMES" :key="theme"><a href="" @click.prevent="setTheme(theme)">{{ theme }}</a></li>
                        </ul>
                    </li>
                </ul>
                <UserMenu />
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
// A page of the SIS API docs (rendered from markdown at build time). Its table
// of contents moves to the right column, highlighting the section being read.
import { loadDoc } from "virtual:sis-docs";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { state } from "@/state";

const route = useRoute();
const router = useRouter();
const html = ref("");
const left = ref<HTMLElement | null>(null);
const right = ref<HTMLElement | null>(null);

interface Spy {
    target: HTMLElement;
    item: HTMLElement;
}

let spies: Spy[] = [];
let highlighted: Spy | null = null;

function docHref(page: string, hash?: string): string {
    return router.resolve({ path: "/docs/" + page, hash: hash ? "#" + hash : "" }).href;
}

// marks an item of the contents and its parent items
function setActive(item: HTMLElement | null, active: boolean): void {
    let el: HTMLElement | null = item;
    while (el && el.tagName === "LI") {
        el.classList.toggle("active", active);
        el = el.parentElement?.tagName === "UL" ? el.parentElement.parentElement : el.parentElement;
    }
}

// only the expanded lists and those of the active section are open
function updateToc(): void {
    right.value?.querySelectorAll<HTMLElement>("li > ul").forEach(function(ul) {
        if (!ul.classList.contains("expand")) {
            ul.classList.add("collapse");
        }
    });
    right.value?.querySelectorAll<HTMLElement>("li.active > ul").forEach((ul) => ul.classList.remove("collapse"));
}

function onScroll(): void {
    let current: Spy | null = null;
    let currentTop = -Infinity;
    for (const spy of spies) {
        const top = spy.target.getBoundingClientRect().top;
        if (top <= 0 && top > currentTop) {
            current = spy;
            currentTop = top;
        }
    }
    if (current !== highlighted) {
        setActive(highlighted?.item ?? null, false);
        setActive(current?.item ?? null, true);
        highlighted = current;
        updateToc();
    }
}

// routes clicks on links to other docs pages (./page.md) and to sections (#id)
function routeLink(a: HTMLAnchorElement, page: string, hash?: string): void {
    a.setAttribute("href", docHref(page, hash));
    a.addEventListener("click", function(event) {
        event.preventDefault();
        void router.push({ path: "/docs/" + page, hash: hash ? "#" + hash : "" });
    });
}

function setUpPage(doc: string): void {
    const leftCol = left.value!;
    const rightCol = right.value!;
    spies = [];
    highlighted = null;
    const toc = leftCol.querySelector("#table-of-contents");
    const list = toc?.nextElementSibling;
    if (toc && list?.tagName === "UL") {
        list.querySelectorAll<HTMLAnchorElement>("a[href^='#']").forEach(function(a) {
            const id = a.getAttribute("href")!.slice(1);
            const target = document.getElementById(id);
            if (target && a.parentElement) {
                spies.push({ target, item: a.parentElement });
            }
            routeLink(a, doc, id);
        });
        list.classList.add("nav", "affix");
        list.setAttribute("role", "complementary");
        list.querySelectorAll(":scope > li > ul").forEach((ul) => ul.classList.add("expand"));
        rightCol.append(list);
        toc.remove();
        updateToc();
    }
    leftCol.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(function(a) {
        const ref = a.getAttribute("href")!;
        if (ref.startsWith(".") && ref.endsWith(".md")) {
            routeLink(a, ref.split("/").pop()!.split(".")[0]!);
        } else if (ref.startsWith("#")) {
            routeLink(a, doc, ref.slice(1));
        }
    });
    if (route.hash) {
        document.getElementById(decodeURIComponent(route.hash.slice(1)))?.scrollIntoView();
    }
    onScroll();
}

watch(() => route.params.doc, async function(doc) {
    const name = String(doc);
    const content = await loadDoc(name);
    if (content === null) {
        void router.replace("/docs/index");
        return;
    }
    if (right.value) {
        right.value.innerHTML = "";
    }
    html.value = content;
    await nextTick();
    setUpPage(name);
}, { immediate: true });

window.addEventListener("scroll", onScroll);
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
    <div class="row">
        <div id="_doc_left" ref="left" class="col-md-9" v-html="html"></div>
        <div v-show="!state.embedded" id="_doc_right" ref="right" class="col-md-3 nav-toc"></div>
    </div>
</template>

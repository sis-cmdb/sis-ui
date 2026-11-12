// A Bootstrap dropdown, as ui-bootstrap's dropdownToggle ran it: the toggle
// opens the menu (class "open" on the .dropdown element); any later click,
// inside the menu or not, and Escape close it.

import { onBeforeUnmount, ref } from "vue";

export function useDropdown() {
    const open = ref(false);

    function close(): void {
        open.value = false;
        document.removeEventListener("click", close);
        document.removeEventListener("keydown", onKeydown);
    }

    function onKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            close();
        }
    }

    function toggle(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (open.value) {
            close();
            return;
        }
        open.value = true;
        document.addEventListener("click", close);
        document.addEventListener("keydown", onKeydown);
    }

    onBeforeUnmount(close);

    return { open, toggle, close };
}

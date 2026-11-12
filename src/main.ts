import "jsondiffpatch/formatters/styles/html.css";
import "jsondiffpatch/formatters/styles/annotated.css";
import "./styles/style.css";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { verifyLogin } from "./state";

void verifyLogin();

createApp(App).use(router).mount("#app");

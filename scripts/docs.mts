// The SIS API docs (the markdown in sis-api/docs), rendered into the UI at
// build time; see the sis-docs plugin in vite.config.mts.

import fs from "node:fs";
import path from "node:path";
import hljs from "highlight.js";
import { Marked, type Tokens } from "marked";

export interface DocPage {
    // the page's url name, e.g. "rbac" for #/docs/rbac
    name: string;
    file: string;
    // shown in the Docs menu
    title: string;
}

const TITLES: Record<string, string> = { rbac: "RBAC", scripts: "Endpoints and Scripts" };

// The markdown pages in docPath, index first, the rest by name. No docPath, no
// pages; a docPath that is not a directory is an error.
export function findDocs(docPath: string | undefined): DocPage[] {
    if (!docPath) {
        return [];
    }
    if (!fs.existsSync(docPath) || !fs.statSync(docPath).isDirectory()) {
        throw new Error("The docs path must be a directory: " + docPath);
    }
    const pages = fs.readdirSync(docPath, { recursive: true, encoding: "utf8" }).sort()
        .filter((rel) => rel.endsWith(".md"))
        .map(function(rel) {
            const name = path.basename(rel, ".md");
            return { name, file: path.join(docPath, rel), title: TITLES[name] || name[0]!.toUpperCase() + name.slice(1) };
        });
    return [...pages.filter((p) => p.name === "index"), ...pages.filter((p) => p.name !== "index")];
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const marked = new Marked({
    breaks: true,
    renderer: {
        // heading ids drive the docs table of contents
        heading(token: Tokens.Heading) {
            const id = token.text.toLowerCase().replace(/[^\w]+/g, "-");
            return "<h" + token.depth + " id=\"" + id + "\">" + this.parser.parseInline(token.tokens) + "</h" + token.depth + ">\n";
        },
        // links to headings that contain dots (e.g. "SIS.Foo") use the heading id form
        link(token: Tokens.Link) {
            if (token.href[0] === "#" && token.text.includes(".")) {
                token.href = "#" + token.text.replace(/[^\w:]/g, "-").toLowerCase();
            }
            // the default link renderer, with the updated token
            return false;
        },
        code(token: Tokens.Code) {
            const lang = (token.lang || "").split(/\s/)[0]!;
            const body = lang && hljs.getLanguage(lang)
                ? hljs.highlight(token.text, { language: lang, ignoreIllegals: true }).value
                : escapeHtml(token.text);
            const cls = lang ? " class=\"lang-" + escapeHtml(lang) + "\"" : "";
            return "<pre><code" + cls + ">" + body + "\n</code></pre>\n";
        }
    }
});

export function renderMarkdown(markdown: string): string {
    return marked.parse(markdown, { async: false });
}

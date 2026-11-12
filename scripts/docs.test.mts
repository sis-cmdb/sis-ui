import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findDocs, renderMarkdown } from "./docs.mts";

function docsDir(files: string[]): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sis-ui-docs-"));
    for (const rel of files) {
        fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), "");
    }
    return dir;
}

describe("findDocs", function() {
    it("lists markdown pages with index first and friendly titles", function() {
        const dir = docsDir(["users.md", "index.md", "rbac.md", "scripts.md", "sub/hooks.md", "notes.txt"]);
        expect(findDocs(dir).map((d) => [d.name, d.title])).toEqual([
            ["index", "Index"], ["rbac", "RBAC"], ["scripts", "Endpoints and Scripts"], ["hooks", "Hooks"], ["users", "Users"]
        ]);
        expect(findDocs(dir)[3]!.file).toBe(path.join(dir, "sub/hooks.md"));
    });

    it("works without an index page", function() {
        expect(findDocs(docsDir(["a.md"])).map((d) => d.name)).toEqual(["a"]);
    });

    it("returns nothing without a docs path and rejects a missing one", function() {
        expect(findDocs(undefined)).toEqual([]);
        expect(() => findDocs("/no/such/dir")).toThrow(/must be a directory/);
    });
});

describe("renderMarkdown", function() {
    it("gives headings ids for the table of contents", function() {
        const html = renderMarkdown("# Bulk Operations\n\n## SIS.Fields & more");
        expect(html).toMatch(/<h1 id="bulk-operations">Bulk Operations<\/h1>/);
        expect(html).toMatch(/<h2 id="sis-fields-more">SIS.Fields &amp; more<\/h2>/);
    });

    it("points links to dotted headings at their ids", function() {
        const html = renderMarkdown("[SIS.Fields](#sisfields) [Other](#other) [x](./a.md)");
        expect(html).toMatch(/href="#sis-fields"/);
        expect(html).toMatch(/href="#other"/);
        expect(html).toMatch(/href="\.\/a\.md"/);
    });

    it("highlights code in known languages and escapes the rest", function() {
        expect(renderMarkdown("```javascript\nvar a = 1;\n```")).toMatch(/<pre><code class="lang-javascript"><span class="hljs-keyword">var<\/span>/);
        const other = renderMarkdown("```nosuchlang\n<b>\n```\n\n```\n<i>\n```");
        expect(other).toMatch(/<code class="lang-nosuchlang">&lt;b&gt;/);
        expect(other).toMatch(/<pre><code>&lt;i&gt;/);
    });

    it("keeps line breaks", function() {
        expect(renderMarkdown("a\nb")).toMatch(/a<br>b/);
    });
});

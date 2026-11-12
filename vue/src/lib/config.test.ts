import { describe, expect, it } from "vitest";
import { readConfig } from "./config";

const page = { origin: "https://ui.example.com", pathname: "/sis/" };

describe("readConfig", function() {
    it("uses API_URL from config.js", function() {
        expect(readConfig({ API_URL: "https://api.example.com" }, page)).toEqual({ apiUrl: "https://api.example.com" });
    });

    it("drops trailing slashes", function() {
        expect(readConfig({ API_URL: "https://api.example.com/sis//" }, page).apiUrl).toBe("https://api.example.com/sis");
    });

    it("falls back to the directory of the page's own url", function() {
        expect(readConfig(undefined, page).apiUrl).toBe("https://ui.example.com/sis");
        expect(readConfig({}, page).apiUrl).toBe("https://ui.example.com/sis");
        expect(readConfig({}, { origin: "https://ui.example.com", pathname: "/sis/index.html" }).apiUrl)
            .toBe("https://ui.example.com/sis");
        expect(readConfig({ API_URL: "" }, { origin: "http://h:9000", pathname: "/" }).apiUrl).toBe("http://h:9000");
    });
});

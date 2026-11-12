import moment from "moment";
import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeDeltaKeys, escapeHtml, expireTime, fromNow, labelWidth, shortDateTime, toRegex, toStringArray,
         validationMessage } from "./format";

describe("format", function() {
    it("escapes html", function() {
        expect(escapeHtml("<img src=\"x\" onerror='y'>&")).toBe("&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;");
        expect(escapeHtml(5)).toBe("5");
    });

    it("escapes the keys of a diff but leaves values to the formatter", function() {
        const delta = { "<b>": { "<i>": [1, 2] }, _t: "a", plain: ["<v>"] };
        expect(escapeDeltaKeys(delta)).toEqual({ "&lt;b&gt;": { "&lt;i&gt;": [1, 2] }, _t: "a", plain: ["<v>"] });
        expect(escapeDeltaKeys(null)).toBeNull();
    });

    it("turns /regex/flags strings into regular expressions", function() {
        const re = toRegex("/^ab+$/i")!;
        expect(re.test("ABB")).toBe(true);
        expect(re.test("ac")).toBe(false);
        expect(toRegex("/a/b/")!.source).toBe("a\\/b");
        expect(toRegex("plain")).toBeNull();
        expect(toRegex("/[/")).toBeNull();
        expect(toRegex("//")).toBeNull();
        expect(toRegex("/a/z")).toBeNull();
        expect(toRegex(null)).toBeNull();
    });

    it("splits comma separated text", function() {
        expect(toStringArray(" a, b,,c ")).toEqual(["a", "b", "c"]);
        const arr = ["x"];
        expect(toStringArray(arr)).toBe(arr);
    });

    it("describes failed validations in words", function() {
        expect(validationMessage({})).toBe("");
        expect(validationMessage(null)).toBe("");
        expect(validationMessage({ required: false, ip: true })).toBe("Not a valid IP address");
        expect(validationMessage({ required: true })).toBe("Required");
        expect(validationMessage({ match: true }, { match: "/^a+$/" })).toBe("Must match /^a+$/");
        expect(validationMessage({ pattern: true })).toBe("Invalid format");
        expect(validationMessage({ min: true }, { min: 1 })).toBe("Must be at least 1");
        expect(validationMessage({ max: true }, { max: 9 })).toBe("Must be at most 9");
        expect(validationMessage({ number: true })).toBe("Must be a number");
        expect(validationMessage({ regex: true })).toBe("Not a valid regular expression");
        expect(validationMessage({ minVal: true })).toBe("Must not be more than max");
        expect(validationMessage({ maxVal: true })).toBe("Must not be less than min");
        expect(validationMessage({ weird: true })).toBe("Invalid (weird)");
    });

    it("sizes labels to the longest name, at least 40px", function() {
        expect(labelWidth(2)).toBe("40px");
        expect(labelWidth(10)).toBe("90px");
    });

    describe("fromNow", function() {
        afterEach(function() {
            vi.useRealTimers();
        });

        // moment counts calendar months, so the reference date matters: month
        // ends, a leap day and a daylight saving change
        it.each([
            new Date(2026, 0, 15, 12, 0, 0),
            new Date(2026, 0, 31, 23, 59, 59),
            new Date(2028, 1, 29, 6, 30, 0),
            new Date(2026, 2, 8, 1, 30, 0),
            new Date(2026, 10, 1, 0, 0, 0)
        ])("says what moment's fromNow says, from %s", function(date) {
            const now = date.getTime();
            vi.useFakeTimers({ now });
            const s = 1000, m = 60 * s, h = 60 * m, d = 24 * h;
            const offsets = [0, 1, 44 * s, 45 * s, 89 * s, 90 * s, 44 * m, 45 * m, 89 * m, 90 * m, 21 * h, 22 * h,
                             35 * h, 36 * h, 25 * d, 26 * d, 45 * d, 319 * d, 320 * d, 345 * d, 547 * d, 548 * d, 3000 * d];
            for (let x = 1; x < 400; x++) {
                offsets.push(Math.round(Math.pow(1.07, x) * 1000));
            }
            for (const offset of offsets) {
                for (const time of [now + offset, now - offset]) {
                    expect(fromNow(time, now), String(time - now)).toBe(moment(new Date(time)).fromNow());
                }
            }
        });

        it("says when a token expires", function() {
            vi.useFakeTimers({ now: Date.UTC(2026, 0, 15, 12, 0, 0) });
            expect(expireTime(0)).toBe("Expired.");
            expect(expireTime("nope")).toBe("Expired.");
            expect(expireTime(null)).toBe("Expired.");
            expect(expireTime(60 * 60 * 1000)).toBe("in an hour");
            expect(expireTime(8 * 60 * 60 * 1000)).toBe("in 8 hours");
        });
    });

    it("formats commit times like moment's MM/DD hh:mm", function() {
        for (const time of [Date.UTC(2026, 0, 5, 0, 7), Date.UTC(2026, 11, 25, 12, 30), Date.UTC(2026, 6, 4, 23, 59),
                            Date.UTC(2026, 2, 9, 9, 5)]) {
            expect(shortDateTime(time)).toBe(moment(new Date(time)).format("MM/DD hh:mm"));
        }
    });
});

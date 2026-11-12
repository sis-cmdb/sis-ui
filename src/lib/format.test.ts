import { afterEach, describe, expect, it, vi } from "vitest";
import MOMENT_OUTPUT from "./format.moment.json";
import { escapeHtml, expireTime, fromNow, labelWidth, shortDateTime, toRegex, toStringArray,
         validationMessage } from "./format";

// what moment 2.8.4, which the AngularJS UI used, said for these times
const MOMENT = MOMENT_OUTPUT as unknown as { timeZone: string; fromNow: Array<[number, number, string]>; shortDateTime: Array<[number, string]> };

describe("format", function() {
    it("escapes html", function() {
        expect(escapeHtml("<img src=\"x\" onerror='y'>&")).toBe("&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;");
        expect(escapeHtml(5)).toBe("5");
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

        // moment counts calendar months, so the expectations cover month ends,
        // a leap day and a daylight saving change (vite.config.mts runs the
        // tests in the fixture's time zone)
        it("says what moment's fromNow said", function() {
            expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(MOMENT.timeZone);
            for (const [now, time, expected] of MOMENT.fromNow) {
                expect(fromNow(time, now), new Date(now).toISOString() + " " + (time - now)).toBe(expected);
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
        for (const [time, expected] of MOMENT.shortDateTime) {
            expect(shortDateTime(time)).toBe(expected);
        }
    });
});

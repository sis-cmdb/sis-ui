import { describe, expect, it } from "vitest";
import { stringifyQuery } from "./url";

describe("stringifyQuery", function() {
    it("encodes like the AngularJS UI did", function() {
        expect(stringifyQuery({ q: "env = prod", p: "1" })).toBe("q=env%20%3D%20prod&p=1");
        expect(stringifyQuery({ q: 'name in "a,b" and t = x:y@z$;' })).toBe("q=name%20in%20%22a,b%22%20and%20t%20%3D%20x:y@z$;");
        expect(stringifyQuery({ q: "a&b=c#d?e/f+g%" })).toBe("q=a%26b%3Dc%23d%3Fe%2Ff%2Bg%25");
    });

    it("writes keys without values and repeated keys, and skips undefined ones", function() {
        expect(stringifyQuery({ flag: null, tag: ["a", "b"], gone: undefined })).toBe("flag&tag=a&tag=b");
        expect(stringifyQuery({ p: 2 })).toBe("p=2");
        expect(stringifyQuery({})).toBe("");
        expect(stringifyQuery(undefined)).toBe("");
    });
});

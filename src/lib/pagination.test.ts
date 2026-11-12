import { describe, expect, it } from "vitest";
import { pageNumbers } from "./pagination";

describe("pageNumbers", function() {
    it("shows every page when there are few", function() {
        expect(pageNumbers(1, 1)).toEqual([1]);
        expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
        expect(pageNumbers(1, 0)).toEqual([]);
    });

    it("shows 7 pages around the current one", function() {
        expect(pageNumbers(1, 20)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(pageNumbers(4, 20)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(pageNumbers(5, 20)).toEqual([2, 3, 4, 5, 6, 7, 8]);
        expect(pageNumbers(10, 20)).toEqual([7, 8, 9, 10, 11, 12, 13]);
        expect(pageNumbers(20, 20)).toEqual([14, 15, 16, 17, 18, 19, 20]);
        expect(pageNumbers(18, 20)).toEqual([14, 15, 16, 17, 18, 19, 20]);
    });
});

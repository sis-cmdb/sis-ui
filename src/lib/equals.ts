// Deep equality as AngularJS's angular.equals: properties that are undefined
// count as missing, and keys starting with "$" are ignored. The forms use it to
// tell whether there is anything to save.
export function looseEquals(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }
    if (typeof a === "number" && typeof b === "number" && isNaN(a) && isNaN(b)) {
        return true;
    }
    if (!a || !b || typeof a !== "object" || typeof b !== "object") {
        return false;
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
        return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((item, i) => looseEquals(item, b[i]));
    }
    const x = a as Record<string, unknown>;
    const y = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    for (const key of keys) {
        if (key[0] === "$" || typeof x[key] === "function" || typeof y[key] === "function") {
            continue;
        }
        if (!looseEquals(x[key], y[key])) {
            return false;
        }
    }
    return true;
}

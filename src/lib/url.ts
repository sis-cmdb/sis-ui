// Query strings encoded as the AngularJS UI wrote them (its encodeUriQuery),
// so urls keep their form: spaces as %20, "=" as %3D, but @ : $ , ; readable.

type Value = string | number | null | undefined;

function encodePart(text: string): string {
    return encodeURIComponent(text).replace(/%40/g, "@").replace(/%3A/gi, ":").replace(/%24/g, "$")
        .replace(/%2C/gi, ",").replace(/%3B/gi, ";");
}

// { q: "a = 1", p: 2 } -> "q=a%20%3D%201&p=2" (without the "?"); a null value
// is a key without a value, an undefined one is left out
export function stringifyQuery(query: Record<string, Value | Value[]> | undefined): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query || {})) {
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item === undefined) {
                continue;
            }
            parts.push(item === null ? encodePart(key) : encodePart(key) + "=" + encodePart(String(item)));
        }
    }
    return parts.join("&");
}

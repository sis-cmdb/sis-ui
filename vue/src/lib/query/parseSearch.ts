// The filter box query language: text such as `cpus > 2 and env = prod`,
// parsed by the grammar in src/pegjs/query.pegjs, becomes a SIS query object.

import { parse } from "@grammar/query.pegjs";

export type Query = Record<string, unknown>;

// what the grammar produces: [field, op, value] or [left, "and"|"or", right]
type Parsed = [string | Parsed, string, string | Parsed];

const OPERATORS: Record<string, string> = {
    ">=": "$gte",
    "<=": "$lte",
    "<": "$lt",
    ">": "$gt",
    "!=": "$ne"
};

// numbers are compared as numbers
function toValue(text: string): string | number {
    return isNaN(Number(text)) || text === "" ? text : parseFloat(text);
}

function toQuery(parsed: Parsed): Query {
    const [left, rawOp, right] = parsed;
    const op = rawOp.toLowerCase();
    if (Array.isArray(left) || Array.isArray(right)) {
        return { ["$" + op]: [toQuery(left as Parsed), toQuery(right as Parsed)] };
    }
    const field = left as string;
    const value = right as string;
    if (op in OPERATORS) {
        return { [field]: { [OPERATORS[op]!]: toValue(value) } };
    }
    if (op === "in" || op === "nin") {
        return { [field]: { ["$" + op]: value.split(",").map((s) => toValue(s.trim())) } };
    }
    if (op === "like") {
        return { [field]: { $regex: value, $options: "i" } };
    }
    return { [field]: toValue(value) };
}

// filter text -> SIS query, or null when it is empty or does not parse
export function parseSearch(search: string | null | undefined): Query | null {
    if (!search) {
        return null;
    }
    try {
        return toQuery(parse(search) as Parsed);
    } catch {
        return null;
    }
}

export { parse as parseQueryText };

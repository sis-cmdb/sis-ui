// Text formatting and escaping helpers (ports of SisUtil and the AngularJS
// filters).

export function escapeHtml(text: unknown): string {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// "/^ab+$/i" -> /^ab+$/i; null for anything else, including invalid patterns
export function toRegex(text: string | RegExp | null | undefined): RegExp | null {
    if (text instanceof RegExp) {
        return text;
    }
    if (!text || text[0] !== "/") {
        return null;
    }
    const parts = text.split("/");
    if (parts.length < 3) {
        return null;
    }
    const flags = parts.pop()!;
    const pattern = parts.slice(1).join("/");
    if (!pattern) {
        return null;
    }
    try {
        return new RegExp(pattern, flags);
    } catch {
        return null;
    }
}

// " a, b,,c " -> ["a", "b", "c"]; arrays are returned as they are
export function toStringArray(text: string | string[]): string[] {
    if (Array.isArray(text)) {
        return text;
    }
    return text.split(",").map((s) => s.trim()).filter((s) => s !== "");
}

// constraints of a field, for validation messages
export interface FieldConstraints {
    match?: string;
    min?: number;
    max?: number;
}

// message for the first failed validation, e.g. { required: true } -> "Required"
export function validationMessage(errors: Record<string, boolean> | null | undefined, field: FieldConstraints = {}): string {
    for (const [kind, failed] of Object.entries(errors || {})) {
        if (!failed) {
            continue;
        }
        switch (kind) {
            case "required": return "Required";
            case "ip": return "Not a valid IP address";
            case "number": return "Must be a number";
            case "pattern":
            case "match": return field.match ? "Must match " + field.match : "Invalid format";
            case "min": return "Must be at least " + field.min;
            case "max": return "Must be at most " + field.max;
            case "regex": return "Not a valid regular expression";
            case "minVal": return "Must not be more than max";
            case "maxVal": return "Must not be less than min";
            default: return "Invalid (" + kind + ")";
        }
    }
    return "";
}

// width of a form label for the longest field name, in css
export function labelWidth(nameLength: number): string {
    return Math.max(nameLength * 9, 40) + "px";
}

const DAY_MS = 864e5;

// 400 years have 146097 days
function daysToYears(days: number): number {
    return days * 400 / 146097;
}

// time plus whole months in local time; the day is clamped to the month's
// length (Jan 31 + 1 month = Feb 28)
function addMonths(time: number, months: number): number {
    const date = new Date(time);
    const month = date.getMonth() + months;
    const daysInMonth = new Date(Date.UTC(date.getFullYear(), month + 1, 0)).getUTCDate();
    date.setMonth(month, Math.min(date.getDate(), daysInMonth));
    return date.getTime();
}

// whole calendar months from earlier to later, and the ms left over
function monthsBetween(earlier: number, later: number): { months: number; ms: number } {
    const a = new Date(earlier);
    const b = new Date(later);
    let months = b.getMonth() - a.getMonth() + (b.getFullYear() - a.getFullYear()) * 12;
    if (addMonths(earlier, months) > later) {
        months--;
    }
    return { months, ms: later - addMonths(earlier, months) };
}

// Time from now in words, exactly as moment's fromNow() says it ("in an hour",
// "3 days ago"), which the UI used before: whole calendar months plus the rest,
// rounded to the largest fitting unit.
export function fromNow(time: number, now: number = Date.now()): string {
    const { months, ms } = time > now ? monthsBetween(now, time) : monthsBetween(time, now);
    const monthDays = Math.round(months / 12 / daysToYears(1));
    const seconds = Math.round(monthDays * 86400 + ms / 1000);
    const minutes = Math.round(monthDays * 1440 + ms / 6e4);
    const hours = Math.round(monthDays * 24 + ms / 36e5);
    const days = Math.round(monthDays + ms / DAY_MS);
    const exactMonths = months + daysToYears(ms / DAY_MS) * 12;
    const roundMonths = Math.round(exactMonths);
    const years = Math.round(exactMonths / 12);
    const words = seconds < 45 ? "a few seconds"
        : minutes === 1 ? "a minute"
        : minutes < 45 ? minutes + " minutes"
        : hours === 1 ? "an hour"
        : hours < 22 ? hours + " hours"
        : days === 1 ? "a day"
        : days < 26 ? days + " days"
        : roundMonths === 1 ? "a month"
        : roundMonths < 11 ? roundMonths + " months"
        : years === 1 ? "a year"
        : years + " years";
    return time > now ? "in " + words : words + " ago";
}

// when a token expires, from the ms it is still valid for
export function expireTime(validForMs: number | string | null | undefined, now: number = Date.now()): string {
    const ms = parseInt(String(validForMs), 10);
    if (isNaN(ms) || ms === 0) {
        return "Expired.";
    }
    return fromNow(now + ms, now);
}

function pad(n: number): string {
    return n < 10 ? "0" + n : String(n);
}

// "MM/DD hh:mm" in local time, 12 hour clock (the commit list's format)
export function shortDateTime(time: number): string {
    const date = new Date(time);
    return pad(date.getMonth() + 1) + "/" + pad(date.getDate()) + " " +
        pad(date.getHours() % 12 || 12) + ":" + pad(date.getMinutes());
}

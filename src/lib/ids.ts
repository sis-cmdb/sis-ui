// ids for linking labels and error messages to inputs
let next = 1;

export function uniqueId(prefix: string): string {
    return prefix + "_" + next++;
}

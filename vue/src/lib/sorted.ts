// An object's entries sorted by key: AngularJS 1.2 repeated objects in key
// order, and the lists in the UI keep that order.
export function sortedEntries<V>(obj: Record<string, V> | null | undefined): Array<[string, V]> {
    return Object.entries(obj || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

// The page numbers shown by the pagination control (smart-table's algorithm,
// which the AngularJS UI used): up to `displayed` pages around the current one.
export function pageNumbers(page: number, numPages: number, displayed = 7): number[] {
    let start = Math.max(1, page - Math.floor(displayed / 2));
    let end = start + displayed;
    if (end > numPages) {
        end = numPages + 1;
        start = Math.max(1, end - displayed);
    }
    const pages: number[] = [];
    for (let i = start; i < end; i++) {
        pages.push(i);
    }
    return pages;
}

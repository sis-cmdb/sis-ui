// The parts of moment 2.8.4 (no bundled types) the parity tests compare with.
declare module "moment" {
    interface Moment {
        fromNow(): string;
        format(format: string): string;
    }
    function moment(date?: Date): Moment;
    export default moment;
}

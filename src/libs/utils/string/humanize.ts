export type HumanizeNumberOptions = {
	/**
	 * @example 1000 => 1,000
	 * @default ","
	 */
	delimiter?: string;
	/**
	 * @example 1.1
	 * @default "."
	 */
	separator?: string;
};
export function humanizeNumber(n: number, options: HumanizeNumberOptions = {}) {
	const d = options.delimiter || ',';
	const s = options.separator || '.';
	const ns = n.toString().split('.');
	if (ns[0]) ns[0] = ns[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + d);
	return ns.join(s);
}

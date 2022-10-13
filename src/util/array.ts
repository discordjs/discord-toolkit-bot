/**
 * Compute the accumulated length for all strings within an array
 *
 * @param array - The array to compute
 * @returns The accumulated length of all strings in the array
 */
export function stringArrayLength(array: string[]) {
	return array.reduce((acc, cur) => acc + cur.length, 0);
}

/**
 * Truncate an array based on the capped accumulated length of all strings within it
 *
 * @param arr - The array to truncate
 * @param maxLength - The maxmim string length to allow
 * @returns The truncated array
 */
export function truncateArray(arr: string[], maxLength: number): string[] {
	if (stringArrayLength(arr) < maxLength) {
		return arr;
	}

	let length = 0;
	let index = 0;
	while (length < maxLength) {
		length += arr[index]!.length;
		index++;
	}

	return arr.slice(0, index - 1);
}

/**
 * Trim leading indents from an array of strings, keeping the indent delta between lines consistent
 *
 * @param lines - The lines to trim
 * @returns Trimmed lines
 */
export function trimLeadingIndent(lines: string[]) {
	// eslint-disable-next-line unicorn/no-unsafe-regex
	const minimumSpaces = Math.min(...lines.filter(Boolean).map((line) => /^(?:\t|\s{2})+/.exec(line)?.[0]?.length ?? 0));
	return lines.map((line) => line.slice(minimumSpaces));
}

export function stringArrayLength(arr: string[]) {
	return arr.reduce((acc, cur) => acc + cur.length, 0);
}

export function truncateArrayJoin(arr: string[], maxLength: number): string[] {
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

export function removeArrayTrailingSpaces(lines: string[]) {
	const minimumSpaces = Math.min(...lines.filter(Boolean).map((line) => /^\t+/.exec(line)?.[0]?.length ?? 0));
	return lines.map((line) => line.slice(minimumSpaces));
}

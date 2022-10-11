export function stringArrayLength(arr: string[]) {
	return arr.reduce((acc, cur) => acc + cur.length, 0);
}

export function arrayEllipsis(arr: string[], maxLength: number) {
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

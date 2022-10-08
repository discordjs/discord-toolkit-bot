export function ellipsis(text: string, maxLength: number) {
	return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
}

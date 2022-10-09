import { Buffer } from "node:buffer";
import kleur from "kleur";

export function convertUrlToRawUrl(url: string) {
	return (
		url
			// eslint-disable-next-line prefer-named-capture-group
			.replace(">", "")
			.replace("github.com", "raw.githubusercontent.com")
			.replace(/\/(?:blob|(?:blame))/, "")
	);
}

export function resolveLines(startLine: number, endLine: number, isOnThread: boolean) {
	if (startLine > endLine || (Number.isNaN(startLine) && !Number.isNaN(endLine))) {
		// eslint-disable-next-line no-param-reassign
		[startLine, endLine] = [endLine, startLine];
	}

	if (startLine < 1) {
		// eslint-disable-next-line no-param-reassign
		startLine = 1;
	}

	if (Number.isNaN(endLine)) {
		return {
			startLine,
			endLine: null,
			delta: 0,
		};
	}

	const delta = Number(endLine) - startLine;
	return {
		startLine,
		endLine: delta > 10 && isOnThread ? startLine + 10 : endLine,
		delta,
	};
}

export function formatLine(start: number, end: number, index: number, ansi = false) {
	const line = String(index + start).padEnd(String(end || "").length ?? 1, " ");
	return ansi ? kleur.cyan(line) : line;
}

export function stringArrayLength(arr: string[]) {
	return arr.reduce((acc, cur) => acc + cur.length, 0);
}

export function validateFileSize(file: Buffer) {
	return Buffer.byteLength(file) < 8_000_000;
}
import { Buffer } from "node:buffer";
import { inlineCode, italic } from "discord.js";
import kleur from "kleur";
import { GitHubUrlLinesRegex } from "./regex.js";

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

export function formatLine(line: string, start: number, end: number, index: number, ansi = false) {
	const prefix = String(index + start).padEnd(String(end || "").length ?? 1, " ");
	return `${ansi ? kleur.cyan(prefix) : prefix} | ${line}`;
}

export function stringArrayLength(arr: string[]) {
	return arr.reduce((acc, cur) => acc + cur.length, 0);
}

export function validateFileSize(file: Buffer) {
	return Buffer.byteLength(file) < 8_000_000;
}

export function resolveFileLanguage(url: string) {
	return url!.split(".").pop()?.replace(GitHubUrlLinesRegex, "") ?? "ansi";
}

export function generateHeader(
	startLine: number,
	endLine: number | null,
	path: string,
	delta: number,
	onThread: boolean,
	fullFile: boolean,
): string {
	const isRange = !endLine || endLine !== startLine;

	return fullFile
		? `Full file from ${inlineCode(path)}`
		: `${
				isRange
					? `Lines ${inlineCode(String(startLine))} to ${inlineCode(String(endLine))}`
					: `Line ${inlineCode(String(startLine))}`
		  } of ${italic(path)} ${onThread && delta > 10 ? "(Limited to 10 lines)" : ""}`;
}

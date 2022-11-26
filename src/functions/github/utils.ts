import { inlineCode } from "discord.js";
import kleur from "kleur";
import { GitHubUrlLinesRegex } from "./regex.js";

type GenerateHeaderOptions = {
	ellipsed?: boolean;
	endLine: number | null;
	path: string;
	startLine: number;
};

export function convertUrlToRawUrl(url: string) {
	return url
		.replace(">", "")
		.replace("github.com", "raw.githubusercontent.com")
		.replace(/\/(?:blob|(?:blame))/, "");
}

type LineOpts = {
	end?: number;
	start?: number;
};

export function resolveLines(opts: string | undefined) {
	const lines = opts?.match(GitHubUrlLinesRegex)?.groups as LineOpts | undefined;
	let [startLine, endLine] = [Number(lines?.start), Number(lines?.end)];

	if (startLine > endLine || (Number.isNaN(startLine) && !Number.isNaN(endLine))) {
		[startLine, endLine] = [endLine, startLine];
	}

	if (startLine < 1) {
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
		endLine,
		delta,
	};
}

export function formatLine(line: string, start: number, end: number, index: number, ansi = false) {
	const prefix = String(index + start).padEnd(String(end || "").length ?? 1, " ");
	return `${ansi ? kleur.cyan(prefix) : prefix} | ${line}`;
}

export function resolveFileLanguage(url: string) {
	return url!.split(".").pop()?.replace(GitHubUrlLinesRegex, "") ?? "ansi";
}

export function generateHeader({ startLine, ellipsed, endLine, path }: GenerateHeaderOptions): string {
	const isRange = !endLine || endLine !== startLine;

	const flags = [];

	if (ellipsed) {
		flags.push("(Limited to 2000 characters)");
	}

	if (Number.isNaN(endLine) && Number.isNaN(startLine)) {
		return inlineCode(path);
	}

	return `${
		isRange
			? `Lines ${inlineCode(String(startLine))} to ${inlineCode(String(endLine))}`
			: `Line ${inlineCode(String(startLine))}`
	} of ${inlineCode(path)} ${flags.join(" ")}`;
}

import { Buffer } from "node:buffer";
import { URL } from "node:url";
import type { AttachmentPayload, Collection } from "discord.js";
import { codeBlock } from "discord.js";
import kleur from "kleur";
import { container } from "tsyringe";
import { request } from "undici";
import { kGitHubCache } from "../../tokens.js";
import { trimLeadingIndent, truncateArray } from "../../util/array.js";
import { URL_REGEX } from "../../util/constants.js";
import type { GitHubCacheEntry } from "../../util/github.js";
import { GistGitHubUrlRegex, NormalGitHubUrlRegex } from "./regex.js";
import { formatLine, generateHeader, resolveFileLanguage, resolveLines } from "./utils.js";

const SAFE_BOUNDARY = 100;

enum GitHubUrlType {
	Normal,
	Gist,
	Diff,
}

export type GitHubMatchResult = {
	converter(url: string): string | null;
	opts: string | undefined;
	regex: RegExp;
	type: GitHubUrlType;
	url: string;
};

const validators = [
	{
		type: GitHubUrlType.Normal,
		regex: NormalGitHubUrlRegex,
		converter: (url: string): string =>
			url
				.replace(">", "")
				.replace("github.com", "raw.githubusercontent.com")
				.replace(/\/(?:blob|(?:blame))/, ""),
	},
	{
		type: GitHubUrlType.Gist,
		regex: GistGitHubUrlRegex,
		converter: (url: string): string | null => {
			// eslint-disable-next-line unicorn/no-unsafe-regex
			const { user, id, opts } = new RegExp(GistGitHubUrlRegex, "").exec(url.replace(/(?:-L\d+)+/, ""))!.groups!;

			if (!user || !id || !opts) {
				return null;
			}

			const fileName = opts.split("-").slice(0, -1).join(".");
			const extension = opts.split("-").pop();

			return `https://gist.githubusercontent.com/${user}/${id}/raw/${fileName}.${extension}`;
		},
	},
];

export async function matchGitHubUrls(text: string): Promise<GitHubMatchResult[]> {
	const urls = new Set(text.matchAll(URL_REGEX));
	if (!urls.size) return [];

	const matches = Array.from(urls)
		.map(([url]) => {
			const match = validators.find((validator) => validator.regex.exec(url!));
			if (!match) return null;

			const regexMatch = match.regex.exec(url!);
			const { opts } = regexMatch!.groups!;
			if (!regexMatch || !regexMatch[0]) return null;

			return {
				url: regexMatch[0],
				opts,
				...match,
			};
		})
		.filter(Boolean) as GitHubMatchResult[];

	if (!matches.length) return [];
	return matches;
}

type ResolvedGitHubResult = {
	content: string;
	ellipsed: boolean;
	files: AttachmentPayload[];
};

export async function resolveGithubRawFile(
	url: string,
	cache: Collection<string, GitHubCacheEntry>,
): Promise<string | null> {
	// eslint-disable-next-line unicorn/no-unsafe-regex
	const cleanUrl = url.replace(/#L\d+(?:-L\d+)?/, "");

	if (cache.has(cleanUrl)) {
		const entry = cache.get(cleanUrl)!;
		entry.lastUsed = Date.now();
		return entry.payload;
	}

	const rawFile = await request(cleanUrl).then(async (res) => (res.statusCode === 200 ? res.body.text() : null));
	if (!rawFile) return null;

	cache.set(cleanUrl, {
		payload: rawFile,
		lastUsed: Date.now(),
	});

	return rawFile;
}

export async function resolveGitHubResults(matches: GitHubMatchResult[]) {
	const results: ResolvedGitHubResult[] = [];
	const cache = container.resolve<Collection<string, GitHubCacheEntry>>(kGitHubCache);

	for (const { url, opts, converter, type } of matches) {
		const rawUrl = converter(url);
		if (!rawUrl) continue;

		const rawFile = await resolveGithubRawFile(rawUrl, cache);
		if (!rawFile) continue;
		const { startLine, endLine } = resolveLines(opts);

		const lang = resolveFileLanguage(rawUrl);
		const path = new URL(url).pathname;
		const parsedLines = rawFile.split("\n");

		const [safeStartLine, safeEndLine] = [
			Math.min(startLine, parsedLines.length),
			Math.min(endLine ? endLine : startLine, parsedLines.length),
		];

		const linesRequested = parsedLines.slice(safeStartLine - 1, safeEndLine);
		const hasCodeBlock = linesRequested.some((line) => line.includes("```"));

		const header = generateHeader({
			startLine: safeStartLine,
			endLine: safeEndLine,
			path,
		});

		if (hasCodeBlock) {
			results.push({
				content: header,
				ellipsed: false,
				files: [
					{
						attachment: Buffer.from(linesRequested.join("\n")),
						name: type === GitHubUrlType.Gist ? `${path}.${lang}` : path,
					},
				],
			});
			continue;
		}

		const formattedLines = trimLeadingIndent(linesRequested).map((line, index) =>
			formatLine(line, safeStartLine, safeEndLine, index, lang === "ansi"),
		);

		const safeLinesRequested = truncateArray(formattedLines, 2_000 - (header.length + SAFE_BOUNDARY + lang.length));
		const joinedSafeLines = safeLinesRequested.join("\n");

		const ellipsed = safeLinesRequested.length !== formattedLines.length;

		const content = [
			generateHeader({
				startLine: safeStartLine,
				endLine: safeLinesRequested.length + safeStartLine - 1,
				path,
				ellipsed,
			}),
			codeBlock(joinedSafeLines.length ? lang : "ansi", joinedSafeLines || kleur.red("Couldn't find any lines")),
		].join("\n");

		if (content.length >= 2_000) {
			results.push({
				content: header,
				ellipsed,
				files: [
					{
						attachment: Buffer.from(linesRequested.join("\n")),
						name: type === GitHubUrlType.Gist ? `${path}.${lang}` : path,
					},
				],
			});
		} else {
			results.push({
				content,
				ellipsed,
				files: [],
			});
		}
	}

	return results;
}

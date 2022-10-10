import { Buffer } from "node:buffer";
import { setTimeout as wait } from "node:timers/promises";
import { URL } from "node:url";
import { ellipsis } from "@yuudachi/framework";
import type { VoiceChannel } from "discord.js";
import {
	type AnyThreadChannel,
	type Message,
	ThreadAutoArchiveDuration,
	codeBlock,
	inlineCode,
	italic,
	ChannelType,
} from "discord.js";
import { request } from "undici";
import { URL_REGEX } from "../../util/constants.js";
import { formatLine, resolveLines, stringArrayLength, validateFileSize } from "./utils.js";

const NormalGitHubUrlRegex =
	// eslint-disable-next-line unicorn/no-unsafe-regex
	/https:\/\/github\.com\/(?<org>.+?)\/(?<repo>.+?)\/(?:(?:blob)|(?:blame))(?<path>\/[^\s#>]+)(?<opts>[^\s>]+)?/g;

const GistGitHubUrlRegex =
	// eslint-disable-next-line unicorn/no-unsafe-regex
	/https:\/\/gist\.github\.com\/(?<user>.+?)\/(?<id>[^\s#>]+)#file-(?<opts>[^\s>]+)/g;

// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlLinesRegex = /[#-]?[LR](?<start>(?:\d|[^\n->])+)?(?:-[LR](?<end>\d+))?/;

const SAFE_BOUNDARY = 10;

const validators = [
	{
		type: "github",
		regex: NormalGitHubUrlRegex,
		predicate: (url: string) => url.match(NormalGitHubUrlRegex),
		converter: (url: string): string =>
			url
				.replace(">", "")
				.replace("github.com", "raw.githubusercontent.com")
				.replace(/\/(?:blob|(?:blame))/, ""),
	},
	{
		type: "gist",
		regex: GistGitHubUrlRegex,
		predicate: (url: string) => url.match(GistGitHubUrlRegex),
		converter: (url: string): string | null => {
			// eslint-disable-next-line unicorn/no-unsafe-regex
			const { user, id, opts } = new RegExp(GistGitHubUrlRegex, "").exec(url.replace(/(?:-L\d+)+/, ""))!.groups!;

			if (!user || !id || !opts) {
				return null;
			}

			const fileName = opts.split("-").slice(0, -1).join("-");
			const extension = opts.split("-").pop();

			return `https://gist.githubusercontent.com/${user}/${id}/raw/${fileName}.${extension}`;
		},
	},
];

export async function handleGithubUrls(message: Message<true>) {
	const urls = new Set(message.content.matchAll(URL_REGEX));
	if (!urls) return;

	const matches = [...urls].map(([url]) => {
		const match = validators.find((validator) => validator.predicate(url!));
		if (!match) return null;

		return {
			regexMatch: new RegExp(match.regex, "").exec(url!),
			...match,
		};
	});

	if (urls.size === matches.filter(Boolean).length) {
		await message.suppressEmbeds(true);
		await wait(500);
	}

	const isOnThread =
		message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildAnnouncement;

	let thread: AnyThreadChannel<boolean> | VoiceChannel | null = isOnThread ? message.channel : null;

	const tempContent: string[] = [];

	for (const match of matches) {
		if (!match || !match.regexMatch) continue;
		const { opts } = match.regexMatch!.groups!;
		const lines = opts?.match(GitHubUrlLinesRegex)?.groups;

		const isGist = match.type === "gist";

		const path = new URL(match.regexMatch![0]!).pathname;

		const nStart = Number(lines?.start);
		const nEnd = Number(lines?.end);
		const fullFile = !lines || (Number.isNaN(nStart) && Number.isNaN(nEnd));

		const { startLine, endLine, delta } = resolveLines(nStart, nEnd, isOnThread);

		const url = match.converter(match.regexMatch[0]!);

		if (!url) continue;

		const rawFile = await request(url).then(async (res) => {
			return res.statusCode === 200 ? res.body.text() : null;
		});

		if (!rawFile) continue;

		if (!validateFileSize(Buffer.from(rawFile)) && fullFile) continue;

		const lang = url!.split(".").pop()?.replace(GitHubUrlLinesRegex, "") ?? "ansi";

		if (!thread) {
			thread = await message.startThread({
				name: `GitHub Lines for this message`,
				reason: "Resolving GitHub link",
				autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
			});
		}

		if (fullFile) {
			await thread.send({
				content: `Full file from ${inlineCode(path)}`,
				files: [
					{
						attachment: Buffer.from(rawFile),
						name: isGist ? `${path}.${lang}` : path,
					},
				],
			});

			continue;
		}

		const parsedLines = rawFile.split("\n");

		const [safeStartLine, safeEndLine] = [
			Math.min(startLine, parsedLines.length),
			Math.min(endLine ? endLine : startLine, parsedLines.length),
		];
		const linesRequested = parsedLines.slice(safeStartLine - 1, safeEndLine);

		const content = [
			`${
				endLine
					? `Lines ${inlineCode(String(safeStartLine))} to ${inlineCode(String(safeEndLine))}`
					: `Line ${inlineCode(String(safeStartLine))}`
			} of ${italic(path)} ${isOnThread && delta > 10 ? "(Limited to 10 lines)" : ""}`,
		];

		const maxLength = isOnThread ? 500 : 2_000 - (content[0]!.length + SAFE_BOUNDARY + lang.length);

		content.push(
			codeBlock(
				lang,
				ellipsis(
					linesRequested
						.map((line, index) => `${formatLine(safeStartLine, safeEndLine, index, lang === "ansi")} | ${line}`)
						.join("\n"),
					maxLength,
				) || "No content",
			),
		);

		if (content.join("\n").length + SAFE_BOUNDARY >= 2_000) {
			await thread.send(content.join("\n"));
		} else if (isOnThread || stringArrayLength(tempContent) + content.join("\n").length + SAFE_BOUNDARY >= 2_000) {
			await thread.send(tempContent.join("\n") || content.join("\n"));

			tempContent.length = 0;
		} else {
			tempContent.push(content.join("\n"));
		}

		if (isOnThread) break;
	}

	if (!tempContent.length || !thread || isOnThread) return;
	await thread.send(tempContent.join("\n"));
}

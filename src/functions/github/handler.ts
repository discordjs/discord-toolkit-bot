import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { logger } from "@yuudachi/framework";
import {
	type AnyThreadChannel,
	type Message,
	type VoiceChannel,
	PermissionFlagsBits,
	ThreadAutoArchiveDuration,
	codeBlock,
	ChannelType,
} from "discord.js";
import { request } from "undici";
import { truncateArray, stringArrayLength, trimLeadingIndent } from "../../util/array.js";
import { URL_REGEX } from "../../util/constants.js";
import { GistGitHubUrlRegex, NormalGitHubUrlRegex } from "./regex.js";
import { formatLine, generateHeader, resolveFileLanguage, resolveLines, validateFileSize } from "./utils.js";

const SAFE_BOUNDARY = 100;

enum GitHubUrlType {
	Normal,
	Gist,
	Diff,
}

type MatchResult = {
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

			const fileName = opts.split("-").slice(0, -1).join("-");
			const extension = opts.split("-").pop();

			return `https://gist.githubusercontent.com/${user}/${id}/raw/${fileName}.${extension}`;
		},
	},
];

export async function handleGithubUrls(message: Message<true>) {
	const urls = new Set(message.content.matchAll(URL_REGEX));
	if (!urls.size) return;

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
		.filter(Boolean) as MatchResult[];

	if (!matches.length) return;

	const isOnThread = message.channel
		.permissionsFor(message.guild!.members.me!)!
		.has(PermissionFlagsBits.CreatePublicThreads)
		? message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildAnnouncement
		: true;

	logger.info(
		{
			urls: matches.map((match) => ({
				type: GitHubUrlType[match!.type] ?? "Unknown type",
				url: match!.url ?? "Unknown url",
			})),
			user: message.author.id,
			isOnThread,
		},
		"GitHub URL(s) detected",
	);

	let thread: AnyThreadChannel<boolean> | VoiceChannel | null = isOnThread
		? (message.channel as AnyThreadChannel<boolean> | VoiceChannel)
		: null;

	const tempContent: string[] = [];

	for (const { url, opts, converter, type } of matches) {
		const rawUrl = converter(url);
		if (!rawUrl) continue;

		const rawFile = await request(rawUrl).then(async (res) => {
			return res.statusCode === 200 ? res.body.text() : null;
		});
		if (!rawFile) continue;

		const { startLine, endLine, delta, fullFile } = resolveLines(opts, isOnThread);

		if (!validateFileSize(Buffer.from(rawFile)) && fullFile) {
			logger.info(
				{
					file: {
						rawUrl,
						user: message.author.id,
					},
				},
				"File too large to be sent",
			);
			continue;
		}

		const lang = resolveFileLanguage(rawUrl);

		if (!thread) {
			thread = await message.startThread({
				name: `GitHub Lines for this message`,
				reason: "Resolving GitHub link",
				autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
			});
		}

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
			delta,
			onThread: isOnThread,
			fullFile,
		});

		if (fullFile || hasCodeBlock) {
			await thread.send({
				content: header,
				files: [
					{
						attachment: Buffer.from(hasCodeBlock ? linesRequested.join("\n") : rawFile),
						name: type === GitHubUrlType.Gist ? `${path}.${lang}` : path,
					},
				],
			});

			if (isOnThread) break;
			continue;
		}

		const formattedLines = trimLeadingIndent(linesRequested).map((line, index) =>
			formatLine(line, safeStartLine, safeEndLine, index, lang === "ansi"),
		);

		const safeLinesRequested = truncateArray(
			formattedLines,
			isOnThread ? 500 : 2_000 - (header.length + SAFE_BOUNDARY + lang.length),
		);

		const content = [
			generateHeader({
				startLine: safeStartLine,
				endLine: safeLinesRequested.length + safeStartLine - 1,
				path,
				delta,
				onThread: isOnThread,
				fullFile,
				ellipsed: safeLinesRequested.length !== linesRequested.length,
			}),
			codeBlock(lang, safeLinesRequested.join("\n") || "Couldn't find any lines"),
		].join("\n");

		if (content.length + SAFE_BOUNDARY >= 2_000) {
			await thread.send(content);
		} else if (isOnThread || stringArrayLength(tempContent) + content.length + SAFE_BOUNDARY >= 2_000) {
			await thread.send(tempContent.join("\n") || content);

			tempContent.length = 0;
			if (content.length && !tempContent.join("\n")) tempContent.push(content);
		} else {
			tempContent.push(content);
		}

		if (isOnThread) break;
	}

	if (!tempContent.length || !thread || isOnThread) return;
	await thread.send(tempContent.join("\n"));
}

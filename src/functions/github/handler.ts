import { Buffer } from "node:buffer";
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
import { convertUrlToRawUrl, formatLine, resolveLines, stringArrayLength, validateFileSize } from "./utils.js";

const NormalGitHubUrlRegex =
	// eslint-disable-next-line unicorn/no-unsafe-regex
	/https:\/\/github\.com\/(?<org>.+?)\/(?<repo>.+?)\/(?:(?:blob)|(?:blame))(?<path>\/[^\s#>]+)(?<opts>[^\s>]+)?/g;

// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlLinesRegex = /^#?[LR](?<start>(?:\d|[^\n-])+)?(?:-[LR](?<end>\d+))?/;

const SAFE_BOUNDARY = 10;

export async function handleGithubUrls(message: Message<true>) {
	const matches = new Set(message.content.matchAll(NormalGitHubUrlRegex));
	if (!matches) return;

	const isOnThread =
		message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildAnnouncement;

	let thread: AnyThreadChannel<boolean> | VoiceChannel | null = isOnThread ? message.channel : null;

	const tempContent: string[] = [];

	for (const match of matches) {
		const { org, repo, path, opts } = match.groups!;
		const lines = opts?.match(GitHubUrlLinesRegex)?.groups;

		const nStart = Number(lines?.start);
		const nEnd = Number(lines?.end);
		const fullFile = !lines || (Number.isNaN(nStart) && Number.isNaN(nEnd));

		const { startLine, endLine, delta } = resolveLines(nStart, nEnd, isOnThread);

		const url = convertUrlToRawUrl(match[0]!);

		const rawFile = await request(url).then(async (res) => {
			return res.statusCode === 200 ? res.body.text() : null;
		});

		if (!rawFile) continue;

		if (!validateFileSize(Buffer.from(rawFile)) && fullFile) continue;

		const lang = path!.split(".").pop() ?? "ansi";

		if (!thread) {
			thread = await message.startThread({
				name: `GitHub Lines for this message`,
				reason: "Resolving GitHub link",
				autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
			});
		}

		if (fullFile) {
			await thread.send({
				content: `Full file from ${inlineCode(`${org}/${repo}${path}`)}`,
				files: [
					{
						attachment: Buffer.from(rawFile),
						name: `${repo}-${path}`,
					},
				],
			});

			continue;
		}

		const parsedLines = rawFile.split("\n");

		const [safeStartLine, safeEndLine] = [
			Math.min(startLine, parsedLines.length) - 1,
			Math.min(endLine ? endLine : startLine, parsedLines.length),
		];
		const linesRequested = parsedLines.slice(safeStartLine, safeEndLine);

		const content = [
			`${
				endLine
					? `Lines ${inlineCode(String(safeStartLine))} to ${inlineCode(String(safeEndLine))}`
					: `Line ${inlineCode(String(safeStartLine))}`
			} of ${italic(`${org}/${repo}${path}`)} ${isOnThread && delta > 10 ? "(Limited to 10 lines)" : ""}`,
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

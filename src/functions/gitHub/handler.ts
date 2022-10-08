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
import kleur from "kleur";
import { request } from "undici";
import { ellipsis } from "../../util/ellipsis.js";
import { convertUrlToRawUrl } from "../../util/gitHub.js";

// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlRegex = /https:\/\/github.com\/(?<org>.+?)\/(?<repo>.+?)\/blob(?<path>\/[^\n#]+)(?<opts>.+)?/g;
// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlLinesRegex = /^#L(?<start>\d+)(?:-L(?<end>\d+))?/;

const SAFE_BOUNDARY = 10;

function resolveEndLine(startLine: number, endLine: number, isOnThread: boolean) {
	if (Number.isNaN(endLine)) {
		return {
			endLine: startLine,
			delta: 0,
		};
	}

	const delta = Number(endLine) - startLine;
	return {
		endLine: delta > 10 && isOnThread ? startLine + 10 : endLine,
		delta,
	};
}

function formatLine(start: number, end: string, index: number, ansi = false) {
	const line = String(index + start).padEnd(end?.length ?? 1, " ");
	return ansi ? kleur.cyan(line) : line;
}

function stringArrayLength(arr: string[]) {
	return arr.reduce((acc, cur) => acc + cur.length, 0);
}

export async function handleGithubUrls(message: Message<true>) {
	const matches = new Set(message.content.matchAll(GitHubUrlRegex));
	if (!matches) return;

	const isOnThread =
		message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildAnnouncement;

	let thread: AnyThreadChannel<boolean> | VoiceChannel | null = isOnThread ? message.channel : null;

	const tempContent: string[] = [];

	for (const match of matches) {
		const { org, repo, path, opts } = match.groups!;
		const lines = opts?.match(GitHubUrlLinesRegex)?.groups;

		if (!lines) continue;

		const { start, end } = lines;

		const startLine = Number(start);
		if (Number.isNaN(startLine)) continue;

		const { endLine, delta } = resolveEndLine(startLine, Number(end), isOnThread);

		const url = convertUrlToRawUrl(match[0]!);

		const rewFile = await request(url).then(async (res) => res.body.text());
		const linesRequested = rewFile.split("\n").slice(startLine - 1, end ? endLine : startLine);

		const lang = path!.split(".").pop() ?? "ansi";

		const content = [
			`${end ? `Lines ${inlineCode(start!)} to ${inlineCode(end)}` : `Line ${inlineCode(start!)}`} of ${italic(
				`${org}/${repo}${path}`,
			)} ${isOnThread && delta > 10 ? "(Limited to 10 lines)" : ""}`,
		];

		const maxLength = isOnThread ? 500 : 2_000 - (content[0]!.length + SAFE_BOUNDARY + lang.length);

		content.push(
			codeBlock(
				lang,
				ellipsis(
					linesRequested
						.map((line, index) => `${formatLine(startLine, end!, index, lang === "ansi")} | ${line}`)
						.join("\n"),
					maxLength,
				),
			),
		);

		if (!thread) {
			thread = await message.startThread({
				name: `GitHub Lines for this message`,
				reason: "Resolving GitHub link",
				autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
			});
		}

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

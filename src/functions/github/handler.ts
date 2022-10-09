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
import kleur from "kleur";
import { request } from "undici";

// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlRegex = /https:\/\/github\.com\/(?<org>.+?)\/(?<repo>.+?)\/blob(?<path>\/[^\s#>]+)(?<opts>[^\s>]+)?/g;
// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlLinesRegex = /^#L(?<start>\d+)(?:-L(?<end>\d+))?/;

const SAFE_BOUNDARY = 10;

function convertUrlToRawUrl(url: string) {
	return (
		url
			// eslint-disable-next-line prefer-named-capture-group
			.replace(">", "")
			.replace("github.com", "raw.githubusercontent.com")
			.replace("/blob", "")
	);
}

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

function validateFileSize(file: Buffer) {
	return Buffer.byteLength(file) < 8_000_000;
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

		const startLine = Number(lines?.start);
		const fullFile = !lines || Number.isNaN(startLine);

		const { endLine, delta } = resolveEndLine(startLine, Number(lines?.end), isOnThread);

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

		const { start, end } = lines!;

		const linesRequested = rawFile.split("\n").slice(startLine - 1, end ? endLine : startLine);

		const content = [
			`${
				end ? `Lines ${inlineCode(start!)} to ${inlineCode(String(endLine))}` : `Line ${inlineCode(start!)}`
			} of ${italic(`${org}/${repo}${path}`)} ${isOnThread && delta > 10 ? "(Limited to 10 lines)" : ""}`,
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

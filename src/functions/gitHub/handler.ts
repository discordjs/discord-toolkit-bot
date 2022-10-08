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
import { ellipsis } from "../../util/ellipsis.js";
import { convertUrlToRawUrl } from "../../util/gitHub.js";

// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlRegex = /https:\/\/github.com\/(?<org>.+?)\/(?<repo>.+?)\/blob(?<path>\/[^\n#]+)(?<opts>.+)?/g;
// eslint-disable-next-line unicorn/no-unsafe-regex
const GitHubUrlLinesRegex = /^#L(?<start>\d+)(?:-L(?<end>\d+))?/;

export async function handleGithubUrls(message: Message<true>) {
	const matches = new Set(message.content.matchAll(GitHubUrlRegex));
	if (!matches) return;
	console.log(...matches);

	const isOnThread =
		message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildAnnouncement;

	let thread: AnyThreadChannel<boolean> | VoiceChannel | null = isOnThread ? message.channel : null;

	const tempContent: string[] = [];

	for (const match of matches) {
		const { org, repo, path, opts } = match.groups!;
		const lines = opts?.match(GitHubUrlLinesRegex)?.groups;

		if (!lines) continue;

		const { start, end } = lines;

		const nStart = Number(start);
		const delta = end ? Number(end) - nStart : 0;
		const nEnd = delta > 10 && isOnThread ? nStart + 10 : Number(end);

		if (Number.isNaN(nStart)) continue;

		const url = convertUrlToRawUrl(match[0]!);

		const rewFile = await request(url).then(async (res) => res.body.text());
		const linesRequested = rewFile.split("\n").slice(nStart - 1, end ? nEnd : nStart);

		const lang = path!.split(".").pop() ?? "text";

		const content = [
			`${end ? `Lines ${inlineCode(start!)} to ${inlineCode(end)}` : `Line ${inlineCode(start!)}`} of ${italic(
				`${org}/${repo}${path}`,
			)} ${isOnThread && delta > 10 ? "(Limited to 10 lines)" : ""}`,
		];

		const safeBoundary = 10;
		const maxLength = isOnThread ? 500 : 2_000 - (content[0]!.length + safeBoundary + lang.length);

		content.push(
			codeBlock(
				lang,
				ellipsis(
					linesRequested
						.map((line, index) => `${String(index + nStart).padEnd(end?.length ?? 1, " ")} | ${line}`)
						.join("\n"),
					maxLength,
				),
			),
		);

		if (!thread) {
			thread = await message.startThread({
				name: `GitHub Lines for this message`,
				reason: "Message contained a GitHub URL that points to specific lines",
				autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
			});
		}

		if (
			isOnThread ||
			tempContent.reduce((a, b) => a + b.length, 0) + content.join("\n").length + safeBoundary >= 2_000
		) {
			await thread.send(tempContent.join("\n") || content.join("\n"));
			if (isOnThread) break;

			tempContent.length = 0;
		} else {
			tempContent.push(content.join("\n"));
		}
	}

	if (!tempContent.length || !thread || isOnThread) return;
	await thread.send(tempContent.join("\n"));
}

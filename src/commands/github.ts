import { Command } from "@yuudachi/framework";
import type { InteractionParam, CommandMethod, ArgsParam } from "@yuudachi/framework/types";
import { Collection } from "discord.js";
import type { AttachmentPayload, InteractionReplyOptions } from "discord.js";
import kleur from "kleur";
import { inject, injectable } from "tsyringe";
import { matchGitHubUrls, resolveGitHubResults } from "../functions/github/handler.js";
import type { GithubResolveContextCommand } from "../interactions/context/githubResolveContext.js";
import { kGitHubCache } from "../tokens.js";
import type { GitHubCacheEntry } from "../util/github.js";

kleur.enabled = true;

@injectable()
export default class extends Command<typeof GithubResolveContextCommand> {
	public constructor(@inject(kGitHubCache) private readonly cache: Collection<string, GitHubCacheEntry>) {
		super(["Resolve GitHub links"]);
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof GithubResolveContextCommand>,
	): Promise<void> {
		if (this.cache.has(args.message.id)) {
			const cached = this.cache.get(args.message.id)!;

			cached.lastUsed = Date.now();

			await this.reply(interaction, cached.payloads);
			return;
		}

		const matches = await matchGitHubUrls(args.message.content);
		if (!matches.length) {
			await interaction.reply({
				ephemeral: true,
				content: "No GitHub links with specified lines to resolve found in this message.",
			});
			return;
		}

		const resolvedMatches = await resolveGitHubResults(matches);
		if (!resolvedMatches.length) {
			await interaction.reply({
				ephemeral: true,
				content: "No GitHub links with specified lines to resolve found in this message.",
			});
			return;
		}

		console.dir(resolvedMatches);
		const payloads: InteractionReplyOptions[] = [];
		const contentParts: string[] = [];

		for (const match of resolvedMatches) {
			if (match.ellipsed) {
				payloads.push({
					content: match.content,
				});
				continue;
			}

			if (contentParts.join("\n").length + match.content.length > 2_000) {
				payloads.push({
					content: contentParts.join("\n"),
				});
				contentParts.length = 0;
				continue;
			}

			contentParts.push(match.content);
		}

		if (contentParts.length) {
			payloads.push({
				content: contentParts.join("\n"),
			});
		}

		await this.reply(
			interaction,
			payloads.map((payload, idx) => ({
				...payload,
				ephemeral: true,
				files: this.resolveFiles(resolvedMatches, idx),
			})),
		);
	}

	private async reply(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		payloads: InteractionReplyOptions[],
	) {
		this.cache.set(interaction.targetMessage.id, {
			lastUsed: Date.now(),
			payloads,
		});

		await interaction.reply(payloads.at(0)!);

		if (payloads.length > 1) {
			for (const payload of payloads.slice(1)) {
				await interaction.followUp({
					...payload,
					ephemeral: true,
				});
			}
		}
	}

	private resolveFiles(matches: Awaited<ReturnType<typeof resolveGitHubResults>>, idx: number) {
		if (idx !== 0) return [];

		return matches.reduce<AttachmentPayload[]>((acc, match) => {
			if (match.files) {
				acc.push(...match.files);
			}

			return acc;
		}, []);
	}
}

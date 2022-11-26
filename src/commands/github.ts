import { Command } from "@yuudachi/framework";
import type { InteractionParam, CommandMethod, ArgsParam } from "@yuudachi/framework/types";
import type { AttachmentPayload, InteractionReplyOptions } from "discord.js";
import kleur from "kleur";
import { matchGitHubUrls, resolveGitHubResults } from "../functions/github/handler.js";
import type { GithubResolveContextCommand } from "../interactions/context/githubResolveContext.js";

kleur.enabled = true;

export default class extends Command<typeof GithubResolveContextCommand> {
	public constructor() {
		super(["Resolve GitHub links"]);
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof GithubResolveContextCommand>,
	): Promise<void> {
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

		await interaction.reply({
			ephemeral: true,
			content: payloads[0]!.content,
			files: resolvedMatches.reduce<AttachmentPayload[]>((acc, match) => {
				if (match.files) {
					acc.push(...match.files);
				}

				return acc;
			}, []),
		});

		if (payloads.length > 1) {
			for (const payload of payloads.slice(1)) {
				await interaction.followUp({
					...payload,
					ephemeral: true,
				});
			}
		}
	}
}

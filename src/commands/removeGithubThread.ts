import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { PermissionFlagsBits } from "discord.js";
import { NormalGitHubUrlRegex, GitHubUrlLinesRegex } from "../functions/github/regex.js";
import type { RemoveGithubThread } from "../interactions/context/removeGithubThread.js";

export default class extends Command<typeof RemoveGithubThread> {
	public constructor() {
		super(["Remove Github Thread"]);
	}
	private matchURL(content: string): boolean {
		return [NormalGitHubUrlRegex, GitHubUrlLinesRegex].some((regex) => regex.test(content));
	}
	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof RemoveGithubThread>,
	): Promise<void> {
		if (interaction.channel?.isThread()) {
			const starterMessage = await interaction.channel.fetchStarterMessage();
			if (!this.matchURL(starterMessage?.content!) && interaction.channel.ownerId !== interaction.client.user.id) {
				interaction.reply({ content: "This is not github thread.", ephemeral: true });
				return;
			}
			if (
				interaction.user.id !== starterMessage?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				interaction.reply({ content: "You are not able to do it.", ephemeral: true });
				return;
			}
			interaction.channel.delete("Remove Github Lines command!");
		} else {
			if (
				!args.message.hasThread ||
				args.message.thread?.ownerId !== interaction.client.user.id ||
				!this.matchURL(args.message.content)
			) {
				interaction.reply({ content: "No Github Thread found.", ephemeral: true });
				return;
			}
			if (
				interaction.user.id !== args.message?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				interaction.reply({ content: "You are not able to do it.", ephemeral: true });
				return;
			}
			args.message.thread?.delete("Remove Github Lines command!");
			interaction.reply({ content: "Thread succesfully deleted.", ephemeral: true });
		}
	}
}

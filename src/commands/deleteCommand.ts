import { setTimeout as wait } from "node:timers/promises";
import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { PermissionFlagsBits } from "discord.js";
import type { DeleteCommandContextCommand } from "../interactions/context/deleteCommand.js";
import { GITHUB_THREAD_NAME } from "../util/constants.js";

export default class extends Command<typeof DeleteCommandContextCommand> {
	public constructor() {
		super(["Delete Command"]);
	}

	private matchChannelName(name: string): boolean {
		return name === GITHUB_THREAD_NAME;
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof DeleteCommandContextCommand>,
	): Promise<void> {
		if (args.message.interaction) {
			if (
				args.message.interaction.user.id !== interaction.user.id ||
				!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)
			) {
				await interaction.reply({ content: "You are not author of this command.", ephemeral: true });
				return;
			}

			await args.message.delete();
			await interaction.reply({ content: "Command successfully deleted.", ephemeral: true });
		} else if (interaction.channel?.isThread()) {
			const starterMessage = await interaction.channel.fetchStarterMessage();
			if (
				!this.matchChannelName(interaction.channel?.name) &&
				interaction.channel.ownerId !== interaction.client.user.id
			) {
				await interaction.reply({ content: "This is not github thread.", ephemeral: true });
				return;
			}

			if (
				interaction.user.id !== starterMessage?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				await interaction.reply({ content: "You are not able to do it.", ephemeral: true });
				return;
			}

			await wait(2_000);
			await interaction.channel?.delete("Remove Github Lines command!");
		} else if (args.message.hasThread) {
			if (
				args.message.thread?.ownerId !== interaction.client.user.id ||
				!this.matchChannelName(args.message.thread?.name)
			) {
				await interaction.reply({ content: "No Github Thread found.", ephemeral: true });
				return;
			}

			if (
				interaction.user.id !== args.message?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				await interaction.reply({ content: "You are not able to do it.", ephemeral: true });
				return;
			}

			await args.message.thread?.delete("Remove Github Lines command!");
			await interaction.reply({ content: "Thread succesfully deleted.", ephemeral: true });
		}
	}
}

import { setTimeout as wait } from "node:timers/promises";
import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { PermissionFlagsBits, time, TimestampStyles } from "discord.js";
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
				await interaction.reply({ content: "Only the author of a command can remove it.", ephemeral: true });
				return;
			}
			
			if(!args.message.deletable) {
				await interaction.reply({ content: "Cannot delete this message.", ephemeral: true });
				return
			} 

			await args.message.delete();
			await interaction.reply({ content: "Command response deleted.", ephemeral: true });
		} else if (interaction.channel?.isThread()) {
			const starterMessage = await interaction.channel.fetchStarterMessage();
			if (
				!this.matchChannelName(interaction.channel?.name) &&
				interaction.channel.ownerId !== interaction.client.user.id
			) {
				await interaction.reply({ content: "This is not a GitHub thread.", ephemeral: true });
				return;
			}

			if (
				interaction.user.id !== starterMessage?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				await interaction.reply({ content: "You cannot delete this thread.", ephemeral: true });
				return;
			}

			await interaction.reply(`This thread will be deleted in ${time(new Date(Date.now() + 5_000), TimestampStyles.RelativeTime)}`)
			await wait(5_000);
			await interaction.channel?.delete("removed GitHub link thread");
		} else if (args.message.hasThread) {
			if (
				args.message.thread?.ownerId !== interaction.client.user.id ||
				!this.matchChannelName(args.message.thread?.name)
			) {
				await interaction.reply({ content: "No GitHub thread found.", ephemeral: true });
				return;
			}

			if (
				interaction.user.id !== args.message?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				await interaction.reply({ content: "You cannot delete this thread.", ephemeral: true });
				return;
			}

			await interaction.reply({ content: `This thread will be deleted in ${time(new Date(Date.now() + 5_000), TimestampStyles.RelativeTime)}`, ephemeral: true })
			await wait(5_000);
			await args.message.thread?.delete("removed GitHub link thread");
			await interaction.editReply({ content: "Thread succesfully deleted."});
		}
	}
}

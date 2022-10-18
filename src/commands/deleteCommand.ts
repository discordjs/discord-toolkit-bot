import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { PermissionFlagsBits } from "discord.js";
import type { DeleteCommandContextCommand } from "../interactions/context/deleteCommand.js";
import { GITHUB_THREAD_NAME } from "../util/constants.js";

export default class extends Command<typeof DeleteCommandContextCommand> {
	public constructor() {
		super(["Cleanup Message"]);
	}

	private matchChannelName(name: string): boolean {
		return name === GITHUB_THREAD_NAME;
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof DeleteCommandContextCommand>,
	): Promise<void> {
		await interaction.deferReply({ ephemeral: true });
		if (args.message.interaction) {
			if (
				args.message.interaction.user.id !== interaction.user.id &&
				!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)
			) {
				await interaction.editReply({ content: "Only the author of a command can remove it." });
				return;
			}

			if (!args.message.deletable) {
				await interaction.editReply({ content: "Cannot delete this message." });
				return;
			}

			await args.message.delete();
			await interaction.editReply({ content: "Command response deleted." });
		} else if (args.message.hasThread) {
			if (
				args.message.thread?.ownerId !== interaction.client.user.id ||
				!this.matchChannelName(args.message.thread?.name)
			) {
				await interaction.editReply({ content: "No GitHub thread found." });
				return;
			}

			if (
				interaction.user.id !== args.message?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				await interaction.editReply({ content: "You cannot delete this thread." });
				return;
			}

			await args.message.thread?.delete("removed GitHub link thread");
			await interaction.editReply({ content: "Thread succesfully deleted." });
		} else {
			await interaction.editReply({ content: "Cannot cleanup." });
		}
	}
}

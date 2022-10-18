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
		await interaction.deferReply({ ephemeral: true });
		if (args.message.interaction) {
			if (
				args.message.interaction.user.id !== interaction.user.id &&
				!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)
			) {
				await interaction.editReply({ content: "Only the author of a command can remove it.", ephemeral: true });
				return;
			}
			
			if(!args.message.deletable) {
				await interaction.editReply({ content: "Cannot delete this message.", ephemeral: true });
				return
			} 

			await args.message.delete();
			await interaction.editReply({ content: "Command response deleted.", ephemeral: true });
		} else if (interaction.channel?.isThread()) {
			const starterMessage = await interaction.channel.fetchStarterMessage();
			if (
				!this.matchChannelName(interaction.channel?.name) &&
				interaction.channel.ownerId !== interaction.client.user.id
			) {
				await interaction.editReply({ content: "This is not a GitHub thread.", ephemeral: true });
				return;
			}

			if (
				interaction.user.id !== starterMessage?.author.id &&
				!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)
			) {
				await interaction.editReply({ content: "You cannot delete this thread.", ephemeral: true });
				return;
			}

			await interaction.channel?.delete("removed GitHub link thread");
		} else {
			await interaction.editReply({ content: "Cannot cleanup."});
		}
	}
}

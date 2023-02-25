import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { PermissionFlagsBits } from "discord.js";
import type { DeleteCommandContextCommand } from "../interactions/context/deleteCommand.js";

export default class extends Command<typeof DeleteCommandContextCommand> {
	public constructor() {
		super(["Remove Command"]);
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof DeleteCommandContextCommand>,
	): Promise<void> {
		await interaction.deferReply({ ephemeral: true });

		if (!args.message.interaction) {
			await interaction.editReply({ content: "You can only remove command responses." });
			return;
		}

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
	}
}

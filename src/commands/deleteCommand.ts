import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { PermissionFlagsBits } from "discord.js";
import type { DeleteCommandContextCommand } from "../interactions/context/deleteCommand.js";

export default class extends Command<typeof DeleteCommandContextCommand {
	public constructor() {
		super(["Delete Command"]);
	}
	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof DeleteCommandContextCommand>,
	): Promise<void> {
	   if(args.message.interaction.user.id !== interaction.user.id || !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)){
              interaction.reply({ content: "You are not author of this command.", ephemeral: true })
              return
	   }
           args.message.delete()
           interaction.reply({ content: "Command successfully deleted.", ephemeral: true })
	}
}

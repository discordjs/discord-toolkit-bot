import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import type { FormatContextCommand } from "../interactions/context/format.js";
import { format } from "prettier";
import { codeBlock } from "discord.js"

export default class extends Command<typeof FormatContextCommand> {
	public constructor() {
		super(["Format code"]);
	}
	
	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof FormatContextCommand>,
	): Promise<void> {
		await interaction.deferReply({ ephemeral: true });
		const code = format(args.message.content, { 
				printWidth: 120,
				useTabs: true,
				quoteProps: "as-needed",
				trailingComma: "all",
				endOfLine: "lf",
				semi: true,
				singleQuote: true,
				parser: "typescript",
			}
		)
		await interaction.editReply({ content: codeBlock('ts', code) })	
	}
}

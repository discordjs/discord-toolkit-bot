import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { codeBlock } from "discord.js";
import { format } from "prettier";
import type { FormatContextCommand } from "../interactions/context/formatContext.js";

export default class extends Command<typeof FormatContextCommand> {
	public constructor() {
		super(["Format code"]);
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof FormatContextCommand>,
	): Promise<void> {
		await interaction.deferReply({ ephemeral: true });
		if (!args.message.content) {
			await interaction.editReply("There is no code to format here.");
			return;
		}

		const matches = args.message.content.matchAll(/```(?<lang>\w*)\n(?<code>.+?)\n```/gs);
		if (!matches) {
			await interaction.editReply("There is no code to format here.");
			return;
		}

		const codeBlocks: string[] = [];
		for (const match of matches) {
			try {
				const formattedCode = format(match.groups!.code!, {
					printWidth: 120,
					useTabs: true,
					quoteProps: "as-needed",
					trailingComma: "all",
					endOfLine: "lf",
					semi: true,
					singleQuote: true,
					filepath: `code.${match.groups!.lang ?? "ts"}`,
				});
				codeBlocks.push(codeBlock(match.groups!.lang ?? "ts", formattedCode));
			} catch {
				continue;
			}
		}

		if (!codeBlocks.length) {
			await interaction.editReply("Could not format any codeblocks in this message.");
			return;
		}

		await interaction.editReply({ content: codeBlocks.join("\n") });
	}
}

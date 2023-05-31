import { Command, truncate } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { MessageFlags, codeBlock } from "discord.js";
import { format } from "prettier";
import type { PrettierContextCommand } from "../interactions/context/prettierContext.js";
import { DISCORD_MAX_LENGTH_MESSAGE } from "../util/constants.js";

export default class extends Command<typeof PrettierContextCommand> {
	public constructor() {
		super(["Prettier"]);
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof PrettierContextCommand>,
	): Promise<void> {
		if (!args.message.content) {
			await interaction.reply({
				content: "There is no code to format here.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const matches = args.message.content.matchAll(/```(?<lang>\w*)\n?(?<code>.+?)\n?```/gs);
		if (!matches) {
			await interaction.reply({
				content: "There is no code to format here.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const codeBlocks: string[] = [];
		for (const match of matches) {
			const code = match.groups?.code;
			if (!code) {
				continue;
			}

			try {
				const lang = match.groups?.lang ?? "ts";
				const formattedCode = format(code, {
					printWidth: 120,
					useTabs: true,
					quoteProps: "as-needed",
					trailingComma: "all",
					endOfLine: "lf",
					semi: true,
					singleQuote: true,
					filepath: `code.${lang}`,
				});
				codeBlocks.push(codeBlock(lang, formattedCode));
			} catch {
				continue;
			}
		}

		if (!codeBlocks.length) {
			await interaction.reply({
				content: "Could not format any codeblocks in this message.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.reply({
			content: truncate(codeBlocks.join("\n"), DISCORD_MAX_LENGTH_MESSAGE),
			flags: MessageFlags.Ephemeral,
		});
		await interaction.editReply({ content: truncate(codeBlocks.join("\n"), DISCORD_MAX_LENGTH_MESSAGE) });
	}
}

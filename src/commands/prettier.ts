import { Buffer } from "node:buffer";
import { Command, truncate } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import { MessageFlags, codeBlock } from "discord.js";
import { format } from "prettier";
import { PrettierFileContextCommand } from "../interactions/context/prettierContext.js";
import type { PrettierContextCommand } from "../interactions/context/prettierContext.js";
import { DISCORD_MAX_LENGTH_MESSAGE } from "../util/constants.js";

const NO_CODE_RESPONSE = {
	content: "There is no code to format here.",
	flags: MessageFlags.Ephemeral,
} as const;

export default class extends Command<typeof PrettierContextCommand | typeof PrettierFileContextCommand> {
	public constructor() {
		super(["Prettier", "Prettier (file)"]);
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof PrettierContextCommand>,
	): Promise<void> {
		if (!args.message.content) {
			await interaction.reply(NO_CODE_RESPONSE);
			return;
		}

		const useFile = interaction.commandName === PrettierFileContextCommand.name;

		const matches = args.message.content.matchAll(/```(?<lang>\w*)\n?(?<code>.+?)\n?```/gs);
		const results: { code: string; lang?: string }[] = [];

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
				results.push({ code: formattedCode, lang });
			} catch (_error) {
				const error = _error as Error;
				results.push({ code: error.message });
			}
		}

		if (!results.length) {
			await interaction.reply(NO_CODE_RESPONSE);
			return;
		}

		if (!useFile) {
			const shortened = truncate(
				results.map(({ code, lang }) => codeBlock(lang ?? "", code)).join(""),
				DISCORD_MAX_LENGTH_MESSAGE - 12,
			);
			const suffixCodeBlockLength = [...shortened.slice(-3)].filter((char) => char === "`").length;

			await interaction.reply({
				content: `${shortened}${"`".repeat(3 - suffixCodeBlockLength)}`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.reply({
			files: results.map(({ code, lang }, index) => {
				return {
					name: `code-${index}.${lang ?? "txt"}`,
					attachment: Buffer.from(code),
				};
			}),
			flags: MessageFlags.Ephemeral,
		});
	}
}

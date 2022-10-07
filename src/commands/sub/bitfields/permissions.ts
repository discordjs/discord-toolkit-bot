import { codeBlock, inlineCode, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import type { ArgsParam, InteractionParam } from "../../../Command.js";
import type { BitfieldLookupCommand } from "../../../interactions/slash/bitfieldLookup.js";
import { formatBits } from "../../bitfields.js";

export async function permissions(
	interaction: InteractionParam,
	args: ArgsParam<typeof BitfieldLookupCommand>["permissions"],
) {
	if (Number.isNaN(Number.parseInt(args.bitfield, 10))) {
		await interaction.reply({
			content: `Option ${inlineCode(args.bitfield)} cannot be resolved to a bitfield.`,
			ephemeral: true,
		});
		return;
	}

	await interaction.reply({
		content: codeBlock(
			"ansi",
			formatBits(
				new PermissionsBitField(BigInt(args.bitfield)),
				(key: string) => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits],
				"Permission",
			),
		),
		ephemeral: true,
	});
}

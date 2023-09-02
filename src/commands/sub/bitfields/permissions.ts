import type { InteractionParam, ArgsParam } from "@yuudachi/framework/types";
import { inlineCode, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import type { BitfieldLookupCommand } from "../../../interactions/slash/bitfieldLookup.js";
import { formatBitsToEmbed } from "../../bitfields.js";

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
		embeds: [
			formatBitsToEmbed(
				new PermissionsBitField(BigInt(args.bitfield)),
				(key: string) => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits],
				"Permission",
			),
		],
		ephemeral: true,
	});
}

import { codeBlock, IntentsBitField, GatewayIntentBits } from "discord.js";
import type { ArgsParam, InteractionParam } from "../../../Command.js";
import type { BitfieldLookupCommand } from "../../../interactions/slash/bitfieldLookup.js";
import { formatBits } from "../../bitfields.js";

export async function intents(interaction: InteractionParam, args: ArgsParam<typeof BitfieldLookupCommand>["intents"]) {
	await interaction.reply({
		content: codeBlock(
			"ansi",
			formatBits(
				new IntentsBitField(args.bitfield),
				(key: string) => GatewayIntentBits[key as keyof typeof GatewayIntentBits],
				"Gateway Intent",
			),
		),
		ephemeral: true,
	});
}

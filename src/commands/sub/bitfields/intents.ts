import type { InteractionParam, ArgsParam } from "@yuudachi/framework/types";
import { IntentsBitField, GatewayIntentBits } from "discord.js";
import type { BitfieldLookupCommand } from "../../../interactions/slash/bitfieldLookup.js";
import { formatBitsToEmbed } from "../../bitfields.js";

export async function intents(interaction: InteractionParam, args: ArgsParam<typeof BitfieldLookupCommand>["intents"]) {
	await interaction.reply({
		embeds: [
			formatBitsToEmbed(
				new IntentsBitField(args.bitfield),
				(key: string) => GatewayIntentBits[key as keyof typeof GatewayIntentBits],
				"Gateway Intent",
			),
		],
		ephemeral: true,
	});
}

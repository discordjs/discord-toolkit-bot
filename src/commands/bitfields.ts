import { Command } from "@yuudachi/framework";
import type { InteractionParam, ArgsParam, CommandMethod } from "@yuudachi/framework/types";
import type { APIEmbed } from "discord.js";
import { GatewayIntentBits, codeBlock, IntentsBitField, type BitField, inlineCode } from "discord.js";
import kleur from "kleur";
import type { IntentsLookupContextCommand } from "../interactions/context/intentsLookupContext.js";
import type { BitfieldLookupCommand } from "../interactions/slash/bitfieldLookup.js";
import { intents } from "./sub/bitfields/intents.js";
import { permissions } from "./sub/bitfields/permissions.js";

kleur.enabled = true;

type BitEntry = {
	bit: bigint | number;
	name: string;
	represented: boolean;
};

type BitProducer<T extends bigint | number> = (p1: string) => T;

export function formatBitsToEmbed<T extends bigint | number>(
	bits: BitField<string, T>,
	bitProducer: BitProducer<T>,
	headingPrefix: string,
): APIEmbed {
	const entries: BitEntry[] = [];

	for (const [key, val] of Object.entries(bits.serialize())) {
		if (Number.isNaN(Number.parseInt(key, 10))) {
			entries.push({
				bit: bitProducer(key),
				name: key,
				represented: val,
			});
		}
	}

	return {
		title: `${headingPrefix} deconstruction for bitfield ${inlineCode(String(bits.bitfield))}`,
		description: codeBlock(
			"ansi",
			entries
				.map(
					(entry) =>
						`${entry.represented ? kleur.green("[✔]") : kleur.red("[✖]")} ${entry.name} (${entry.bit}) 1<<${
							entry.bit.toString(2).length - 1
						}`,
				)
				.join("\n"),
		),
	};
}

export default class extends Command<typeof BitfieldLookupCommand | typeof IntentsLookupContextCommand> {
	public constructor() {
		super(["bitfields", "Parse Intents"]);
	}

	public override async chatInput(
		interaction: InteractionParam,
		args: ArgsParam<typeof BitfieldLookupCommand>,
	): Promise<void> {
		switch (Object.keys(args)[0]) {
			case "intents":
				await intents(interaction, args.intents);
				break;
			case "permissions":
				await permissions(interaction, args.permissions);
				break;
			default:
				console.log(args);
		}
	}

	public override async messageContext(
		interaction: InteractionParam<CommandMethod.MessageContext>,
		args: ArgsParam<typeof IntentsLookupContextCommand>,
	): Promise<void> {
		const res =
			/intents:.*?(?<bits>\d{1,10})/gi.exec(args.message.content) ??
			/intents\((?<bits>\d{1,10})\)/gi.exec(args.message.content) ??
			/intents.*?(?<bits>\d{1,10})/gi.exec(args.message.content) ??
			/(?:^|[\s`])(?<bits>\d{1,10}?)(?:$|[\s`])/gi.exec(args.message.content);

		if (!res) {
			await interaction.reply({
				content: "Cannot find any potential Gateway Intent numerals in this message",
				ephemeral: true,
			});
			return;
		}

		const bitnumeral = Number.parseInt(res[1]!, 10);
		await interaction.reply({
			embeds: [
				formatBitsToEmbed(
					new IntentsBitField(bitnumeral),
					(key: string) => GatewayIntentBits[key as keyof typeof GatewayIntentBits],
					"Gateway Intent",
				),
			],
			ephemeral: true,
		});
	}
}

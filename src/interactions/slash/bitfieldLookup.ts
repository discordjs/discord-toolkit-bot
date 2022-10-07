import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";

export const BitfieldLookupCommand = {
	type: ApplicationCommandType.ChatInput,
	name: "bitfields",
	description: "Descructure bitfields",
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "intents",
			description: "Destructure Gateway Intents",
			options: [
				{
					type: ApplicationCommandOptionType.Integer,
					name: "bitfield",
					description: "Intents bitfield to inspect",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "permissions",
			description: "Destructure Permissions ",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "bitfield",
					description: "Permissions bitfield to inspect",
					required: true,
				},
			],
		},
	],
} as const;

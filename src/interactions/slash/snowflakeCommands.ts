import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";

export const SnowflakeCommands = {
	type: ApplicationCommandType.ChatInput,
	name: "snowflake",
	description: "Snowflake utilities",
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "compare",
			description: "Compare two snowflakes",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "snowflake1",
					description: "First snowflake to compare",
					required: true,
				},
				{
					type: ApplicationCommandOptionType.String,
					name: "snowflake2",
					description: "Second snowflake to compare",
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "inspect",
			description: "Inspect snowflake",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "snowflake",
					description: "Snowflake to inspect",
					required: true,
				},
			],
		},
	],
} as const;

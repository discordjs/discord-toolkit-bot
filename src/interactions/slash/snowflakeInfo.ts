import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";

export const SnowflakeInfoCommand = {
	type: ApplicationCommandType.ChatInput,
	name: "snowflakeinfo",
	description: "Inspect snowflake",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "snowflake",
			description: "Snowflake to inspect",
			required: true,
		},
	],
} as const;

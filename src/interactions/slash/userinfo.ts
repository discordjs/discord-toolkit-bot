import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";

export const UserInfoCommand = {
	type: ApplicationCommandType.ChatInput,
	name: "userinfo",
	description: "Show information about the provided user",
	options: [
		{
			name: "user",
			description: "User to show information for",
			type: ApplicationCommandOptionType.User,
			required: true,
		},
	],
} as const;

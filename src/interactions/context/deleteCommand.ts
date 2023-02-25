import { ApplicationCommandType } from "discord.js";

export const DeleteCommandContextCommand = {
	type: ApplicationCommandType.Message,
	name: "Remove Command",
} as const;

import { ApplicationCommandType } from "discord.js";

export const DeleteCommandContextCommand = {
	type: ApplicationCommandType.Message,
	name: "Delete Command",
} as const;

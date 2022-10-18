import { ApplicationCommandType } from "discord.js";

export const DeleteCommandContextCommand = {
	type: ApplicationCommandType.Message,
	name: "Cleanup Message",
} as const;

import { ApplicationCommandType } from "discord.js";

export const PrettierContextCommand = {
	type: ApplicationCommandType.Message,
	name: "Prettier",
} as const;

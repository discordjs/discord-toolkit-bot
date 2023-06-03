import { ApplicationCommandType } from "discord.js";

export const PrettierContextCommand = {
	type: ApplicationCommandType.Message,
	name: "Prettier",
} as const;

export const PrettierFileContextCommand = {
	type: ApplicationCommandType.Message,
	name: "Prettier (file)",
} as const;

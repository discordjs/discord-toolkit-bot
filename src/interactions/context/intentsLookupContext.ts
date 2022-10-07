import { ApplicationCommandType } from "discord.js";

export const IntentsLookupContextCommand = {
	name: "Parse Intents",
	type: ApplicationCommandType.Message,
} as const;

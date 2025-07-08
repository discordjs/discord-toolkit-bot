import { ApplicationCommandType } from "discord-api-types/v10";

export const IntentsLookupContextCommand = {
	name: "Parse Intents",
	type: ApplicationCommandType.Message,
} as const;

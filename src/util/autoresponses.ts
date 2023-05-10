import { container } from "@yuudachi/framework";
import { kAutoresponses } from "../tokens.js";
import type { DiscordJSVersion } from "./constants.js";

export type AutoResponse = {
	content: string;
	discordJSVersions: DiscordJSVersion[];
	keyphrases: string[];
	mention: boolean;
	reply: boolean;
};

export function createAutoResponses() {
	const autoResponses: AutoResponse[] = [];

	container.register(kAutoresponses, { useValue: autoResponses });

	return autoResponses;
}

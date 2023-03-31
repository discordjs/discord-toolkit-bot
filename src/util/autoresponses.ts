import { container } from "@yuudachi/framework";
import { kAutoresponses } from "../tokens.js";

export type AutoResponse = {
	content: string;
	keyphrases: string[];
	mention: boolean;
	reply: boolean;
};

export function createAutoResponses() {
	const autoResponses: AutoResponse[] = [];

	container.register(kAutoresponses, { useValue: autoResponses });

	return autoResponses;
}

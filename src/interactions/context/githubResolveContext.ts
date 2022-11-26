import { ApplicationCommandType } from "discord.js";

export const GithubResolveContextCommand = {
	name: "Resolve GitHub links",
	type: ApplicationCommandType.Message,
} as const;

import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { Events, Client } from "discord.js";
import { injectable } from "tsyringe";

@injectable()
export default class implements Event {
	public name = "Support breaking error warning";

	public event = Events.MessageCreate as const;

	public disabled = false;

	public constructor(public readonly client: Client<true>) {}

	public execute() {
		this.client.on(this.event, async (message) => {
			if (message.author?.bot) {
				return;
			}

			try {
				if (["istextbased is not a function"].some((phrase) => message.content.toLowerCase().includes(phrase))) {
					await message.reply({
						content: [
							"Use `v14.8.0` or newer of discord.js: `npm i discord.js@latest` *(more: <#769862166131245066>)*",
						].join("\n"),
					});
				} else if (["istext is not a function"].some((phrase) => message.content.toLowerCase().includes(phrase))) {
					await message.reply({
						content: [
							"Use `v13.14.0` or newer of discord.js: `npm i discord.js@v13-lts` *(more: <#769862166131245066>)*",
						].join("\n"),
					});
				}
			} catch (error_) {
				const error = error_ as Error;
				logger.error(error, error.message);
			}
		});
	}
}

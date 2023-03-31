import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { Events, Client } from "discord.js";
import { container, injectable } from "tsyringe";
import { kAutoresponses } from "../tokens.js";
import type { AutoResponse } from "../util/autoresponses.js";

@injectable()
export default class implements Event {
	public name = "Auto responses";

	public event = Events.MessageCreate as const;

	public disabled = false;

	public constructor(public readonly client: Client<true>) {}

	public execute() {
		this.client.on(this.event, async (message) => {
			if (message.author?.bot) {
				return;
			}

			const responses = container.resolve<AutoResponse[]>(kAutoresponses);

			try {
				for (const response of responses) {
					if (response.keyphrases.some((phrase) => phrase.length && message.content.toLowerCase().includes(phrase))) {
						const payload = {
							content: response.content,
							allowedMentions: response.mention ? { repliedUser: true } : { parse: [] },
						};

						if (response.reply) {
							await message.reply(payload);
						} else {
							await message.channel.send(payload);
						}
					}
				}
			} catch (error_) {
				const error = error_ as Error;
				logger.error(error, error.message);
			}
		});
	}
}

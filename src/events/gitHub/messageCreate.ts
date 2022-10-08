import { on } from "node:events";
import { setTimeout as wait } from "node:timers/promises";
import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { type Message, Events, Client } from "discord.js";
import { injectable } from "tsyringe";
import { handleGithubUrls } from "../../functions/gitHub/handler.js";

@injectable()
export default class implements Event {
	public name = "Message GitHub lines resolvable";

	public event = Events.MessageCreate as const;

	public constructor(public readonly client: Client<true>) {}

	public async execute() {
		for await (const [message] of on(this.client, this.event) as AsyncIterableIterator<[Message]>) {
			try {
				if (message.author.bot || !message.inGuild()) continue;

				await wait(1_000);

				await handleGithubUrls(message);
			} catch (error_) {
				const error = error_ as Error;
				logger.error(error, error.message);
			}
		}
	}
}

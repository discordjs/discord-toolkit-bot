import { on } from "node:events";
import { setTimeout as wait } from "node:timers/promises";
import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import type { ThreadChannel } from "discord.js";
import { Events, Client } from "discord.js";
import { injectable } from "tsyringe";
import { ASSISTCHANNELS } from "../util/constants.js";

@injectable()
export default class implements Event {
	public name = "Support enquiry";

	public event = Events.ThreadCreate as const;

	public constructor(public readonly client: Client<true>) {}

	public async execute() {
		for await (const [thread, newlyCreated] of on(this.client, this.event) as AsyncIterableIterator<
			[ThreadChannel, boolean]
		>) {
			try {
				await wait(2_000);
				if (!newlyCreated || !ASSISTCHANNELS.includes(thread.parentId ?? "")) continue;

				await thread.send({
					content: [
						"• What's your exact discord.js `npm list discord.js` and node `node -v` version?",
						"• Post the full error stack trace, not just the top part!",
						"• Show your code!",
						"• Explain what exactly your issue is.",
						"• Not a discord.js issue? Check out <#237743386864517122>.",
					].join("\n"),
				});
			} catch (error_) {
				const error = error_ as Error;
				logger.error(error, error.message);
			}
		}
	}
}

import { on } from "node:events";
import { setTimeout as wait } from "node:timers/promises";
import { type ThreadChannel, ChannelType, Events, Client } from "discord.js";
import { injectable } from "tsyringe";
import type { Event } from "../../Event.js";
import { handleGithubUrls } from "../../functions/gitHub/handler.js";
import { ASSISTCHANNELS } from "../../util/constants.js";
import { logger } from "../../util/logger.js";

@injectable()
export default class implements Event {
	public name = "Github thread message lines resolvable";

	public event = Events.ThreadCreate as const;

	public constructor(public readonly client: Client<true>) {}

	public async execute() {
		for await (const [thread, newlyCreated] of on(this.client, this.event) as AsyncIterableIterator<
			[ThreadChannel, boolean]
		>) {
			try {
				await wait(ASSISTCHANNELS.includes(thread.parentId ?? "") ? 2_500 : 1_000);
				if (!newlyCreated || thread.parent!.type !== ChannelType.GuildForum) return;

				const message = await thread.fetchStarterMessage();
				if (!message) return;

				await handleGithubUrls(message);
			} catch (error_) {
				const error = error_ as Error;
				logger.error(error, error.message);
			}
		}
	}
}

import { on } from "node:events";
import { setTimeout as wait } from "node:timers/promises";
import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { type ThreadChannel, ChannelType, Events, Client } from "discord.js";
import { injectable } from "tsyringe";
import { handleGithubUrls } from "../../functions/gitHub/handler.js";
import { ASSISTCHANNELS } from "../../util/constants.js";

@injectable()
export default class implements Event {
	public name = "Forum post GitHub lines resolvable";

	public event = Events.ThreadCreate as const;

	public constructor(public readonly client: Client<true>) {}

	public async execute() {
		for await (const [thread, newlyCreated] of on(this.client, this.event) as AsyncIterableIterator<
			[ThreadChannel, boolean]
		>) {
			try {
				if (!newlyCreated || thread.parent!.type !== ChannelType.GuildForum) return;
				await wait(ASSISTCHANNELS.includes(thread.parentId ?? "") ? 2_500 : 1_000);

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

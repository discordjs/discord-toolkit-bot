import { on } from "node:events";
import type { Event } from "@yuudachi/framework/types";
import type { ThreadChannel } from "discord.js";
import { Events, Client } from "discord.js";
import { injectable } from "tsyringe";
import { logger } from "@yuudachi/framework";
import { GITHUB_THREAD_NAME } from "../../util/constants.js";

@injectable()
export default class implements Event {
	public name = "Delete Archived Github Threads";

	public event = Events.ThreadUpdate as const;

	public constructor(public readonly client: Client<true>) {}

	public async execute() {
		for await (const [oldThread, newThread] of on(this.client, this.event) as AsyncIterableIterator<
			[ThreadChannel, ThreadChannel]
		>) {
			if (oldThread.archived || !newThread.archived) continue;
			if (newThread.ownerId !== this.client.user.id || newThread.name !== GITHUB_THREAD_NAME) continue;
			logger.info(
				{
					parent: newThread.parent?.name ?? "Not cached",
				},
				"Deleting Github Thread!",
			);
			await newThread.delete("Deleting Archived Thread.");
		}
	}
}

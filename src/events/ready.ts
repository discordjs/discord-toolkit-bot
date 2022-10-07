import { on } from "node:events";
import { Events, Client } from "discord.js";
import { injectable } from "tsyringe";
import type { Event } from "../Event.js";
import { logger } from "../util/logger.js";

@injectable()
export default class implements Event {
	public name = "Ready";

	public event = Events.ClientReady as const;

	public constructor(public readonly client: Client<true>) {}

	public async execute() {
		for await (const _ of on(this.client, this.event)) {
			logger.info({
				msg: `Client ready`,
				user: this.client.user.tag,
				id: this.client.user.id,
				guilds: this.client.guilds.cache.map((guild) => guild.name),
			});
		}
	}
}

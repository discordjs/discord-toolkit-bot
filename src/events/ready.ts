import { on } from "node:events";
import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { Events, Client } from "discord.js";
import { injectable } from "tsyringe";

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

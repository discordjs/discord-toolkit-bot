import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { Events, Client, ChannelType } from "discord.js";
import { container, injectable } from "tsyringe";
import { kAutoresponses } from "../tokens.js";
import type { AutoResponse } from "../util/autoresponses.js";
import {
	DiscordJSVersion,
	V13_QUESTIONS_FORUM_TAGS,
	V13_SUPPORT_CHANNEL,
	V14_QUESTIONS_FORUM_TAGS,
	V14_SUPPORT_CHANNEL,
} from "../util/constants.js";

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
					const supportChannels: string[] = [];
					const questionsForumTags: string[] = [];

					if (response.discordJSVersions.includes(DiscordJSVersion.V13)) {
						supportChannels.push(V13_SUPPORT_CHANNEL);
						questionsForumTags.push(...V13_QUESTIONS_FORUM_TAGS);
					}

					if (response.discordJSVersions.includes(DiscordJSVersion.V14)) {
						supportChannels.push(V14_SUPPORT_CHANNEL);
						questionsForumTags.push(...V14_QUESTIONS_FORUM_TAGS);
					}

					if (
						(!supportChannels.includes(message.channel.id) &&
							(message.channel.type !== ChannelType.PublicThread ||
								!message.channel.appliedTags.some((tag) => tag.length && questionsForumTags.includes(tag)))) ||
						!response.keyphrases.some((phrase) => phrase.length && message.content.toLowerCase().includes(phrase))
					) {
						continue;
					}

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
			} catch (error_) {
				const error = error_ as Error;
				logger.error(error, error.message);
			}
		});
	}
}

import { on } from "node:events";
import { logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import type { ThreadChannel } from "discord.js";
import { Events, Client, ComponentType, ButtonStyle } from "discord.js";
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
				if (!newlyCreated || !ASSISTCHANNELS.includes(thread.parentId ?? "")) continue;
				const received = await thread.awaitMessages({ max: 1, time: 60_000, errors: ["time"] }).catch(() => null);
				if (!received) continue;
				const parts: string[] = [];

				if (thread.parent?.name.includes("voice")) {
					parts.push(
						"- What are your intents? `GuildVoiceStates` is **required** to receive voice data!",
						"- Show what dependencies you are using -- `generateDependencyReport()` is exported from `@discordjs/voice`.",
						"- Try looking at common examples: <https://github.com/discordjs/voice-examples>.",
					);
				} else if (thread.parent?.name.includes("djs")) {
					parts.push(
						"- What's your exact discord.js `npm list discord.js` and node `node -v` version?",
						"- Not a discord.js issue? Check out <#1081585952654360687>.",
					);
				}

				parts.push(
					"- Consider reading <#1115899560183730286> to improve your question!",
					"- Explain what exactly your issue is.",
					"- Post the full error stack trace, not just the top part!",
					"- Show your code!",
					"- Issue solved? Press the button!",
				);

				await thread.send({
					content: parts.join("\n"),
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									customId: "solved",
									style: ButtonStyle.Primary,
									label: "Mark post as solved",
								},
							],
						},
					],
				});
			} catch (error_) {
				const error = error_ as Error;
				logger.error(error, error.message);
			}
		}
	}
}

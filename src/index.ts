import "reflect-metadata";
import { readFileSync } from "node:fs";
import process from "node:process";
import { setTimeout } from "node:timers";
import { URL, fileURLToPath } from "node:url";
import type { ToEventProps } from "@discordjs/core";
import { Client, GatewayDispatchEvents, GatewayIntentBits, MessageFlags } from "@discordjs/core";
import { inlineCode } from "@discordjs/formatters";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import * as TOML from "@ltd/j-toml";
import type { GatewayMessageCreateDispatchData } from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ChannelType,
	MessageReferenceType,
	PermissionFlagsBits,
	Routes,
} from "discord-api-types/v10";
import { ComponentType, InteractionType } from "discord-api-types/v9";
import { pino } from "pino";
import { IntentsLookupContextCommand } from "./interactions/context/intentsLookupContext.js";
import { BitfieldLookupCommand } from "./interactions/slash/bitfieldLookup.js";
import { formatBits } from "./util/bits.js";
import { ASSISTCHANNELS, SUPPORT_CHANNEL, SUPPORT_CHANNEL_VOICE } from "./util/constants.js";

type AutoResponse = {
	content: string;
	keyphrases: string[];
	mention: boolean;
	reply: boolean;
};

const autoResponseData = readFileSync(fileURLToPath(new URL("../autoresponses/autoresponses.toml", import.meta.url)));
const logger = pino({ name: "toolkit" });
const autoResponses: AutoResponse[] = [];

try {
	const parsedAutoResponses = TOML.parse(autoResponseData, 1, "\n");

	for (const [key, value] of Object.entries(parsedAutoResponses)) {
		const autoResponse = value as unknown as AutoResponse;
		logger.info(
			{
				autopresponse: { phrases: autoResponse.keyphrases },
			},
			`Registering autoresponse: ${key}`,
		);
		autoResponses.push(autoResponse);
	}
} catch (error_) {
	const error = error_ as Error;
	logger.error(error, error.message);
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
const gateway = new WebSocketManager({
	token: process.env.DISCORD_TOKEN,
	rest,
	intents: GatewayIntentBits.MessageContent | GatewayIntentBits.GuildMessages | GatewayIntentBits.Guilds,
});
const client = new Client({ rest, gateway });

client.on(GatewayDispatchEvents.MessageCreate, async ({ data: message }) => {
	if (message.author.bot) {
		return;
	}

	if (message.content.includes("://discord.com")) {
		void client.api.channels.editMessage(message.channel_id, message.id, {
			flags: (message.flags ?? 0) | MessageFlags.SuppressEmbeds,
		});
	}

	for (const response of autoResponses) {
		if (response.keyphrases.some((phrase) => phrase.length && message.content.toLowerCase().includes(phrase))) {
			await client.api.channels.createMessage(message.channel_id, {
				content: response.content,
				allowed_mentions: response.mention ? { replied_user: true } : { parse: [] },
				message_reference: response.reply
					? {
							message_id: message.id,
							channel_id: message.channel_id,
							guild_id: message.guild_id,
							type: MessageReferenceType.Default,
							fail_if_not_exists: false,
					  }
					: undefined,
			});
		}
	}
});

/**
 * Wait for message in the provided channel
 *
 * @param channelId - The id of the channel to listen in
 * @param timeoutMs - The time in milliseconds to wait until the listener is aborted
 * @returns The received message
 */
async function waitForMessage(channelId: string, timeoutMs?: number) {
	return new Promise((resolve, reject) => {
		const callback = ({ data: message }: ToEventProps<GatewayMessageCreateDispatchData>) => {
			if (message.channel_id === channelId) {
				resolve(message);
			}
		};

		client.once(GatewayDispatchEvents.MessageCreate, callback);

		if (timeoutMs) {
			setTimeout(() => {
				client.off(GatewayDispatchEvents.MessageCreate, callback);
				reject(new Error("time"));
			}, timeoutMs);
		}
	});
}

client.on(GatewayDispatchEvents.ThreadCreate, async ({ data: channel }) => {
	if (!channel.newly_created || !ASSISTCHANNELS.includes(channel.parent_id ?? "")) {
		return;
	}

	// Messages can only be sent after the thread starter message has arrived.
	// This can take substantial amounts of time after thread create in the case of large attachments
	const collected = await waitForMessage(channel.id, 10_000).catch(() => null);
	if (!collected) {
		return;
	}

	const parts: string[] = [];
	if (channel.parent_id === SUPPORT_CHANNEL_VOICE) {
		parts.push(
			"- What are your intents? `GuildVoiceStates` is **required** to receive voice data!",
			"- Show what dependencies you are using -- `generateDependencyReport()` is exported from `@discordjs/voice`.",
			"- Try looking at common examples: <https://github.com/discordjs/voice-examples>.",
		);
	}

	if (channel.parent_id === SUPPORT_CHANNEL) {
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
	);

	await client.api.channels.createMessage(channel.id, {
		flags: MessageFlags.IsComponentsV2,
		components: [
			{
				type: ComponentType.Container,
				components: [
					{
						type: ComponentType.TextDisplay,
						content: parts.join("\n"),
					},
					{
						type: ComponentType.Section,
						components: [
							{
								type: ComponentType.TextDisplay,
								content: "Issue solved? Press the button!",
							},
						],
						accessory: {
							type: ComponentType.Button,
							custom_id: "solved",
							style: ButtonStyle.Success,
							label: "Solved",
						},
					},
				],
			},
		],
	});
});

client.on(GatewayDispatchEvents.InteractionCreate, async ({ data: interaction }) => {
	if (interaction.type === InteractionType.MessageComponent) {
		if (
			interaction.data.custom_id === "solved" &&
			interaction.channel.type === ChannelType.PublicThread &&
			interaction.member
		) {
			const executor = interaction.member.user.id;
			const isOwner = executor === interaction.channel.owner_id;

			const isManager =
				(BigInt(interaction.member.permissions) & PermissionFlagsBits.ManageMessages) ===
				PermissionFlagsBits.ManageMessages;
			const message = isOwner
				? "The thread owner has marked this issue as solved."
				: isManager
				? "The issue has been marked as solved by support staff"
				: undefined;

			if (!isManager && !isOwner) {
				await client.api.interactions.reply(interaction.id, interaction.token, {
					flags: MessageFlags.Ephemeral,
					content: "Only the thread owner or support staff can mark an issue as resolved!",
				});
				return;
			}

			await client.api.channels.createMessage(interaction.channel.id, {
				content: message,
			});

			await client.api.interactions.updateMessage(interaction.id, interaction.token, {});
			void client.rest.patch(Routes.channel(interaction.channel.id), {
				body: {
					archived: true,
					locked: true,
				},
				headers: {
					"X-Audit-Log-Reason": `Marked as solved by ${interaction.member.user.username} (${interaction.member.user.id})`,
				},
			});
		}

		return;
	}

	if (interaction.type === InteractionType.ApplicationCommand) {
		if (
			interaction.data.type === ApplicationCommandType.Message &&
			interaction.data.name === IntentsLookupContextCommand.name
		) {
			const messages = interaction.data.resolved.messages;
			const message = messages[interaction.data.target_id];

			if (!message) {
				logger.info("Expected to find message during context menu execution but found none.");
				return;
			}

			const res =
				/intents:.*?(?<bits>\d{1,10})/gi.exec(message.content) ??
				/intents\((?<bits>\d{1,10})\)/gi.exec(message.content) ??
				/intents.*?(?<bits>\d{1,10})/gi.exec(message.content) ??
				/(?:^|[\s`])(?<bits>\d{1,10}?)(?:$|[\s`])/gi.exec(message.content);

			if (!res) {
				await client.api.interactions.reply(interaction.id, interaction.token, {
					flags: MessageFlags.Ephemeral,
					content: "Cannot find any potential Gateway Intent numerals in this message.",
				});
				return;
			}

			const bits = Number.parseInt(res[1]!, 10);
			const formatted = formatBits(bits, GatewayIntentBits, "Gateway Intent");

			await client.api.interactions.reply(interaction.id, interaction.token, {
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
				components: [formatted],
			});
			return;
		}

		if (
			interaction.data.type === ApplicationCommandType.ChatInput &&
			interaction.data.name === BitfieldLookupCommand.name
		) {
			const sub = interaction.data.options?.[0];

			if (sub?.type !== ApplicationCommandOptionType.Subcommand) {
				return;
			}

			const bitsOption = sub.options?.[0];
			if (bitsOption?.name !== "bitfield") {
				return;
			}

			const bits = bitsOption.value;

			if (typeof bits === "boolean") {
				return;
			}

			if (Number.isNaN(Number.parseInt(String(bits), 10))) {
				await client.api.interactions.reply(interaction.id, interaction.token, {
					flags: MessageFlags.Ephemeral,
					content: `Could not resolve ${inlineCode(String(bits))} to a bit field.`,
				});
				return;
			}

			const serializer = sub.name === "intents" ? GatewayIntentBits : PermissionFlagsBits;
			const prefix = sub.name === "intents" ? "Gateway Intents" : "Permission";
			const formatted = formatBits(typeof bits === "string" ? BigInt(bits) : bits, serializer, prefix);

			await client.api.interactions.reply(interaction.id, interaction.token, {
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
				components: [formatted],
			});

			return;
		}
	}

	void client.api.interactions.reply(interaction.id, interaction.token, {
		content: "This command is currently not available, check back later!",
		flags: MessageFlags.Ephemeral,
	});
	console.log(interaction);
});

process.on("uncaughtException", (error) => {
	logger.error(error, error.message);
});

await gateway.connect();

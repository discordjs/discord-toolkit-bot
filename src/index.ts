import "reflect-metadata";
import { URL, fileURLToPath, pathToFileURL } from "node:url";
import {
	dynamicImport,
	createCommands,
	type Command,
	commandInfo,
	kCommands,
	container,
	logger,
} from "@yuudachi/framework";
import type { CommandPayload, Event } from "@yuudachi/framework/types";
import { Client, GatewayIntentBits, Options } from "discord.js";
import readdirp from "readdirp";
import { createGithubCache } from "./util/github.js";
import { createWebhooks } from "./util/webhooks.js";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
	makeCache: Options.cacheWithLimits({
		MessageManager: 10,
		StageInstanceManager: 10,
		VoiceStateManager: 10,
	}),
	allowedMentions: {
		parse: [],
	},
}).setMaxListeners(20);
container.register(Client, { useValue: client });

createCommands();
createWebhooks();
createGithubCache();

const commandFiles = readdirp(fileURLToPath(new URL("commands", import.meta.url)), {
	fileFilter: "*.js",
	directoryFilter: "!sub",
});

const eventFiles = readdirp(fileURLToPath(new URL("events", import.meta.url)), {
	fileFilter: "*.js",
});

try {
	const commands = container.resolve<Map<string, Command<CommandPayload>>>(kCommands);

	for await (const dir of commandFiles) {
		const cmdInfo = commandInfo(dir.path);

		if (!cmdInfo) {
			continue;
		}

		const dynamic = dynamicImport<new () => Command<CommandPayload>>(
			async () => import(pathToFileURL(dir.fullPath).href),
		);
		const command = container.resolve<Command<CommandPayload>>((await dynamic()).default);
		logger.info(
			{ command: { name: command.name?.join(", ") ?? cmdInfo.name } },
			`Registering command: ${command.name?.join(", ") ?? cmdInfo.name}`,
		);

		if (command.name) {
			for (const name of command.name) {
				commands.set(name.toLowerCase(), command);
			}
		} else {
			commands.set(cmdInfo.name.toLowerCase(), command);
		}
	}

	for await (const dir of eventFiles) {
		const dynamic = dynamicImport<new () => Event>(async () => import(pathToFileURL(dir.fullPath).href));
		const event_ = container.resolve<Event>((await dynamic()).default);
		logger.info({ event: { name: event_.name, event: event_.event } }, `Registering event: ${event_.name}`);

		if (event_.disabled) {
			continue;
		}

		void event_.execute();
	}

	await client.login();
} catch (error_) {
	const error = error_ as Error;
	logger.error(error, error.message);
}

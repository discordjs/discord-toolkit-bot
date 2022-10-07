import "reflect-metadata";
import { URL, fileURLToPath, pathToFileURL } from "node:url";
import { Client, GatewayIntentBits, Options } from "discord.js";
import readdirp from "readdirp";
import { container } from "tsyringe";
import { type Command, commandInfo } from "./Command.js";
import type { Component } from "./Component.js";
import { componentInfo } from "./Component.js";
import type { Event } from "./Event.js";
import type { CommandPayload } from "./interactions/ArgumentsOf.js";
import { kCommands, kComponents } from "./tokens.js";
import { createCommands } from "./util/commands.js";
import { createComponents } from "./util/components.js";
import { dynamicImport } from "./util/dynamicImport.js";
import { logger } from "./util/logger.js";
import { createWebhooks } from "./util/webhooks.js";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
	makeCache: Options.cacheWithLimits({
		MessageManager: 10,
		StageInstanceManager: 10,
		VoiceStateManager: 10,
	}),
}).setMaxListeners(20);
container.register(Client, { useValue: client });

createCommands();
createWebhooks();
createComponents();

const commandFiles = readdirp(fileURLToPath(new URL("commands", import.meta.url)), {
	fileFilter: "*.js",
	directoryFilter: "!sub",
});

const eventFiles = readdirp(fileURLToPath(new URL("events", import.meta.url)), {
	fileFilter: "*.js",
});

const componentFiles = readdirp(fileURLToPath(new URL("components", import.meta.url)), {
	fileFilter: "*.js",
});

try {
	const commands = container.resolve<Map<string, Command<CommandPayload>>>(kCommands);
	const components = container.resolve<Map<string, Component>>(kComponents);

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

	for await (const dir of componentFiles) {
		const compInfo = componentInfo(dir.path);
		if (!compInfo) continue;

		const component = container.resolve<Component>((await import(pathToFileURL(dir.fullPath).href)).default);
		logger.info(
			{ command: { name: component.name ?? component.name } },
			`Registering component handler: ${component.name ?? component.name}`,
		);

		components.set((component.name ?? compInfo.name).toLowerCase(), component);
	}

	await client.login();
} catch (error_) {
	const error = error_ as Error;
	logger.error(error, error.message);
}

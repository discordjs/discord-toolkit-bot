import "reflect-metadata";
import process from "node:process";
import { logger } from "@yuudachi/framework";
import { Routes, REST } from "discord.js";
import {
	SnowflakeInfoCommand,
	BitfieldLookupCommand,
	IntentsLookupContextCommand,
	UserInfoCommand,
	UserInfoContextCommand,
	DeleteCommandContextCommand,
	FormatContextCommand,
} from "./interactions/index.js";

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

try {
	logger.info("Start refreshing interaction (/) commands.");

	const body: unknown[] = [
		UserInfoCommand,
		IntentsLookupContextCommand,
		SnowflakeInfoCommand,
		UserInfoContextCommand,
		BitfieldLookupCommand,
		DeleteCommandContextCommand,
		FormatContextCommand,
	];

	await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
		body,
	});

	logger.info(`Successfully reloaded interaction commands.`);
} catch (error_) {
	const error = error_ as Error;
	logger.error(error.message, error);
}

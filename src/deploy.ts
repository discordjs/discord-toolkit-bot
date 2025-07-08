import "reflect-metadata";
import process from "node:process";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { IntentsLookupContextCommand } from "./interactions/context/intentsLookupContext.js";
import { BitfieldLookupCommand } from "./interactions/slash/bitfieldLookup.js";

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

try {
	console.info("Start refreshing interaction (/) commands.");

	const body: unknown[] = [IntentsLookupContextCommand, BitfieldLookupCommand];

	await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
		body,
	});

	console.info(`Successfully reloaded interaction commands.`);
} catch (error_) {
	const error = error_ as Error;
	console.error(error.message, error);
}

import { Routes, type DiscordAPIError, type REST, type Snowflake } from "discord.js";
import { fetch } from "undici";

type Validator = {
	predicate(p1: REST, p2: Snowflake): Promise<boolean>;
	type: string;
};

const validators: Validator[] = [
	{
		predicate: async (rest: REST, snowflake: Snowflake) => {
			try {
				await rest.get(Routes.channel(snowflake));
				return true;
			} catch (error_) {
				const error = error_ as DiscordAPIError;
				return error.code === 50_001;
			}
		},
		type: "Channel",
	},
	{
		predicate: async (rest: REST, snowflake: Snowflake) => {
			try {
				await rest.get(Routes.guildAuditLog(snowflake));
				return true;
			} catch (error_) {
				const error = error_ as DiscordAPIError;
				return error.code === 50_013;
			}
		},
		type: "Guild",
	},
	{
		predicate: async (rest: REST, snowflake: Snowflake) => {
			try {
				await rest.get(Routes.webhook(snowflake));
				return true;
			} catch (error_) {
				const error = error_ as DiscordAPIError;
				return error.code === 50_013;
			}
		},
		type: "Webhook",
	},
	{
		predicate: async (rest: REST, snowflake: Snowflake) => {
			try {
				await rest.get(Routes.sticker(snowflake));
				return true;
			} catch {
				return false;
			}
		},
		type: "Sticker",
	},
	{
		predicate: async (rest: REST, snowflake: Snowflake) => {
			try {
				const res = await fetch(rest.cdn.emoji(snowflake, "png"));
				return res.ok;
			} catch {
				return false;
			}
		},
		type: "Emoji",
	},
	{
		predicate: async (rest: REST, snowflake: Snowflake) => {
			try {
				await rest.get(Routes.user(snowflake));
				return true;
			} catch {
				return false;
			}
		},
		type: "User",
	},
];

export async function findSnowflakeType(rest: REST, snowflake: Snowflake) {
	for (const validator of validators) {
		if (await validator.predicate(rest, snowflake)) {
			return validator.type;
		}
	}

	return null;
}

const mapper = (val: Validator) => val.type;

export const AllSnowflakeTypes = validators.map(mapper);

import {
	type Snowflake,
	inlineCode,
	type DiscordAPIError,
	type REST,
	SnowflakeUtil,
	TimestampStyles,
	Routes,
	time,
} from "discord.js";
import { fetch } from "undici";
import { type ArgsParam, type InteractionParam, Command } from "../Command.js";
import type { SnowflakeInfoCommand } from "../interactions/slash/snowflakeInfo.js";
import { Colors } from "../util/constants.js";

type Validator = {
	predicate(p1: REST, p2: Snowflake): Promise<boolean>;
	type: string;
};

export default class extends Command<typeof SnowflakeInfoCommand> {
	private validators: Validator[] = [
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

	private async findType(rest: REST, snowflake: Snowflake) {
		for (const validator of this.validators) {
			if (await validator.predicate(rest, snowflake)) {
				return validator.type;
			}
		}

		return null;
	}

	private readonly mapper = (val: Validator) => val.type;

	private allTypes = this.validators.map(this.mapper);

	public override async chatInput(
		interaction: InteractionParam,
		args: ArgsParam<typeof SnowflakeInfoCommand>,
	): Promise<void> {
		if (!/^\d{17,20}$/gi.test(args.snowflake)) {
			await interaction.reply({
				content: "Invalid snowflake",
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply({ ephemeral: true });

		const rest = interaction.client.rest;
		const timestamp = SnowflakeUtil.timestampFrom(args.snowflake);

		const type = await this.findType(rest, args.snowflake);
		const descriptionParts = [
			`Snowflake: ${inlineCode(args.snowflake)}`,
			`Timestamp: ${time(new Date(timestamp), TimestampStyles.LongDateTime)}`,
		];

		if (type) {
			descriptionParts.push(`Type: ${inlineCode(type)}`);
		}

		await interaction.editReply({
			embeds: [
				{
					description: descriptionParts.join(" \n"),
					footer: type
						? undefined
						: {
								text: `The snowflake does not represent a ${new Intl.ListFormat("en-GB", {
									type: "disjunction",
								}).format(this.allTypes)}`,
								icon_url: interaction.client.user.displayAvatarURL(),
						  },
					color: Colors.Dark,
				},
			],
		});
	}
}

import type { ArgsParam, InteractionParam } from "@yuudachi/framework/types";
import { SnowflakeUtil, time, TimestampStyles } from "discord.js";
import type { SnowflakeCommands } from "../../../interactions/index.js";
import { Colors } from "../../../util/constants.js";

export async function compare(interaction: InteractionParam, args: ArgsParam<typeof SnowflakeCommands>["compare"]) {
	if (!/^\d{17,20}$/gi.test(args.snowflake1) || !/^\d{17,20}$/gi.test(args.snowflake2)) {
		await interaction.reply({
			content: "Invalid snowflake",
			ephemeral: true,
		});
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	const snowflake1 = SnowflakeUtil.deconstruct(args.snowflake1);
	const snowflake2 = SnowflakeUtil.deconstruct(args.snowflake2);
	const descriptionParts = [
		`Snowflake 1: ${time(new Date(Number(snowflake1.timestamp)), TimestampStyles.LongDateTime)}`,
		`Snowflake 2: ${time(new Date(Number(snowflake2.timestamp)), TimestampStyles.LongDateTime)}`,
		`Difference: ${
			new Date(Number(snowflake1.timestamp)).getTime() - new Date(Number(snowflake2.timestamp)).getTime()
		}ms`,
	];

	await interaction.editReply({
		embeds: [
			{
				description: descriptionParts.join(" \n"),
				color: Colors.Dark,
			},
		],
	});
}

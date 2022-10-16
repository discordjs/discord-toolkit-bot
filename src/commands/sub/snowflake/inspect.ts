import type { ArgsParam, InteractionParam } from "@yuudachi/framework/types";
import { inlineCode, SnowflakeUtil, time, TimestampStyles } from "discord.js";
import type { SnowflakeCommands } from "../../../interactions/index.js";
import { Colors } from "../../../util/constants.js";
import { AllSnowflakeTypes, findSnowflakeType } from "../../../util/snowflake.js";

export async function inspect(interaction: InteractionParam, args: ArgsParam<typeof SnowflakeCommands>["inspect"]) {
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

	const type = await findSnowflakeType(rest, args.snowflake);
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
							}).format(AllSnowflakeTypes)}`,
							icon_url: interaction.client.user.displayAvatarURL(),
					  },
				color: Colors.Dark,
			},
		],
	});
}

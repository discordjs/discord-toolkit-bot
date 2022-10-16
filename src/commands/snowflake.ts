import { Command } from "@yuudachi/framework";
import type { ArgsParam, InteractionParam } from "@yuudachi/framework/types";
import type { SnowflakeCommands } from "../interactions/index.js";
import { compare } from "./sub/snowflake/compare.js";
import { inspect } from "./sub/snowflake/inspect.js";

export default class extends Command<typeof SnowflakeCommands> {
	public override async chatInput(
		interaction: InteractionParam,
		args: ArgsParam<typeof SnowflakeCommands>,
	): Promise<void> {
		switch (Object.keys(args)[0]) {
			case "inspect":
				await inspect(interaction, args.inspect);
				break;
			case "compare":
				await compare(interaction, args.compare);
				break;
			default:
				console.log(args);
		}
	}
}

import { extname } from "node:path";
import { type ModalSubmitInteraction, basename } from "discord.js";
import { logger } from "./util/logger.js";

export type Component = {
	execute(interaction: ModalSubmitInteraction<"cached">, args: any, locale: string): Promise<unknown> | unknown;
	name?: string;
};

export type ComponentInfo = {
	name: string;
};

export function componentInfo(path: string): ComponentInfo | null {
	logger.debug({
		path,
	});
	if (extname(path) !== ".js") {
		return null;
	}

	return { name: basename(path, ".js") };
}

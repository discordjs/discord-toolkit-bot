import { HeadingLevel, codeBlock, heading, inlineCode } from "@discordjs/formatters";
import type { APIMessageTopLevelComponent, PermissionFlagsBits, GatewayIntentBits } from "discord-api-types/v10";
import { ComponentType } from "discord-api-types/v10";
import kleur from "kleur";

kleur.enabled = true;

/**
 * Format bitfields to a display component based on the provided serilization dictionary
 *
 * @param bits - The bit field to resolve
 * @param serializer - The serialization dictionary of all possible values and their flags to use
 * @param headingPrefix - The prefix to display in the resulting heading
 * @returns A formatted display component representing the provided bit field
 */
export function formatBits<T extends bigint | number>(
	bits: T,
	serializer: typeof GatewayIntentBits | typeof PermissionFlagsBits,
	headingPrefix: string,
): APIMessageTopLevelComponent {
	const formattedFlags: string[] = [];

	for (const [flag, bit] of Object.entries(serializer)) {
		if (!Number.isNaN(Number.parseInt(flag, 10))) {
			// filter out bit -> flagname mappings in bidirectional maps
			continue;
		}

		const isSet = (bits & bit) === bit;
		formattedFlags.push(
			`${isSet ? kleur.green("[✔]") : kleur.red("[✖]")} ${flag} (${bit}) 1<<${bit.toString(2).length - 1}`,
		);
	}

	return {
		type: ComponentType.Container,
		components: [
			{
				type: ComponentType.TextDisplay,
				content: [
					heading(`${headingPrefix} deconstruction for bitfield ${inlineCode(String(bits))}`, HeadingLevel.Three),
					codeBlock("ansi", formattedFlags.join("\n")),
				].join("\n"),
			},
		],
	};
}

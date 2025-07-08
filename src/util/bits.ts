import { codeBlock, inlineCode } from "@discordjs/formatters";
import type { APIMessageTopLevelComponent, PermissionFlagsBits, GatewayIntentBits } from "discord-api-types/v10";
import { ComponentType } from "discord-api-types/v10";
import kleur from "kleur";

kleur.enabled = true;

export function formatBits<T extends bigint | number>(
	bits: T,
	serializer: typeof GatewayIntentBits | typeof PermissionFlagsBits,
	headingPrefix: string,
): APIMessageTopLevelComponent {
	const formattedFlags: string[] = [];

	for (const [flag, bit] of Object.entries(serializer)) {
		if (Number.isNaN(Number.parseInt(flag, 10))) {
			const isSet = (bits && bit) === bit;
			formattedFlags.push(
				`${isSet ? kleur.green("[✔]") : kleur.red("[✖]")} ${flag} (${bit}) 1<<${bit.toString(2).length - 1}`,
			);
		}
	}

	return {
		type: ComponentType.Container,
		components: [
			{
				type: ComponentType.TextDisplay,
				content: [
					`${headingPrefix} deconstruction for bitfield ${inlineCode(String(bits))}`,
					codeBlock("ansi", formattedFlags.join("\n")),
				].join("\n"),
			},
		],
	};
}

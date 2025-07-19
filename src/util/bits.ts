import { HeadingLevel, codeBlock, heading, inlineCode } from "@discordjs/formatters";
import type { APIMessageTopLevelComponent } from "discord-api-types/v10";
import { PermissionFlagsBits, GatewayIntentBits, ComponentType } from "discord-api-types/v10";
import kleur from "kleur";

kleur.enabled = true;

type ResolvedPermissionBits = {
	prefix: "Permission";
	serializer: typeof PermissionFlagsBits;
	value: bigint;
};

type ResolvedGatwayIntentsBits = {
	prefix: "Gatway Intents";
	serializer: typeof GatewayIntentBits;
	value: number;
};

type ResolvedBits = ResolvedGatwayIntentsBits | ResolvedPermissionBits;

/**
 * Resolve possible command input to the correcsponding bit field value and prefix
 *
 * @param bits - The command input to resolve
 * @returns The the resolved value and prefix
 */
export function parseBits(bits: number | string): ResolvedBits | null {
	if (typeof bits === "number") {
		return {
			value: bits,
			prefix: "Gatway Intents",
			serializer: GatewayIntentBits,
		};
	}

	try {
		const permissionBits = bits.endsWith("n") ? BigInt(bits.slice(0, -1)) : BigInt(bits);

		return {
			value: permissionBits,
			prefix: "Permission",
			serializer: PermissionFlagsBits,
		};
	} catch {
		return null;
	}
}

/**
 * Check if a bit is set in the provided bitfield
 *
 * @param field - The bit field to check
 * @param bit - The bit to check for
 * @returns Whether the bit is set in the provided field
 */
function isBitSet(field: bigint | number, bit: bigint | number) {
	if (typeof bit === "number" && typeof field === "number") {
		return (field & bit) === bit;
	}

	if (typeof bit === "bigint" && typeof field === "bigint") {
		return (field & bit) === bit;
	}

	return false;
}

/**
 * Format bitfields to a display component based on the provided serilization dictionary
 *
 * @param resolved - The resolved bits data to format
 * @returns A formatted display component representing the provided bit field
 */
export function formatBits(resolved: ResolvedBits): APIMessageTopLevelComponent {
	const formattedFlags: string[] = [];

	for (const [flag, bit] of Object.entries(resolved.serializer)) {
		if (typeof bit !== typeof resolved.value) {
			continue;
		}

		formattedFlags.push(
			`${isBitSet(resolved.value, bit) ? kleur.green("[✔]") : kleur.red("[✖]")} ${flag} (${bit}) 1<<${
				bit.toString(2).length - 1
			}`,
		);
	}

	return {
		type: ComponentType.Container,
		components: [
			{
				type: ComponentType.TextDisplay,
				content: [
					heading(
						`${resolved.prefix} deconstruction for bitfield ${inlineCode(String(resolved.value))}`,
						HeadingLevel.Three,
					),
					codeBlock("ansi", formattedFlags.join("\n")),
				].join("\n"),
			},
		],
	};
}

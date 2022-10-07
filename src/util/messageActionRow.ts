import { type APIActionRowComponent, type APIMessageActionRowComponent, ComponentType } from "discord.js";

export function createMessageActionRow(
	components: APIMessageActionRowComponent[],
): APIActionRowComponent<APIMessageActionRowComponent> {
	return {
		type: ComponentType.ActionRow,
		components,
	} as const;
}

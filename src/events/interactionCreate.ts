import { transformInteraction, kCommands, type CommandMap, logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { ApplicationCommandType, Events, Client } from "discord.js";
import { injectable, inject } from "tsyringe";

@injectable()
export default class implements Event {
	public name = "Interaction handling";

	public event = Events.InteractionCreate as const;

	public constructor(public readonly client: Client<true>, @inject(kCommands) public readonly commands: CommandMap) {}

	public execute() {
		this.client.on(this.event, async (interaction) => {
			if (
				!interaction.isCommand() &&
				!interaction.isUserContextMenuCommand() &&
				!interaction.isMessageContextMenuCommand() &&
				!interaction.isAutocomplete()
			) {
				return;
			}

			if (!interaction.inCachedGuild()) {
				return;
			}

			const command = this.commands.get(interaction.commandName.toLowerCase());
			if (command) {
				try {
					switch (interaction.commandType) {
						case ApplicationCommandType.ChatInput: {
							const isAutocomplete = interaction.isAutocomplete();

							logger.info(
								{ command: { name: interaction.commandName, type: interaction.type }, userId: interaction.user.id },
								`Executing ${isAutocomplete ? "autocomplete" : "chatInput command"} ${interaction.commandName}`,
							);

							if (isAutocomplete) {
								await command.autocomplete(interaction, transformInteraction(interaction.options.data), "");
								break;
							} else {
								await command.chatInput(interaction, transformInteraction(interaction.options.data), "");
								break;
							}
						}

						case ApplicationCommandType.Message: {
							logger.info(
								{ command: { name: interaction.commandName, type: interaction.type }, userId: interaction.user.id },
								`Executing message context command ${interaction.commandName}`,
							);

							await command.messageContext(interaction, transformInteraction(interaction.options.data), "");
							break;
						}

						case ApplicationCommandType.User: {
							logger.info(
								{ command: { name: interaction.commandName, type: interaction.type }, userId: interaction.user.id },
								`Executing user context command ${interaction.commandName}`,
							);

							await command.userContext(interaction, transformInteraction(interaction.options.data), "");
							break;
						}

						default:
							break;
					}
				} catch (error_) {
					const error = error_ as Error;
					logger.error(error, error.message);

					try {
						if (interaction.isAutocomplete()) {
							return;
						}

						if (!interaction.deferred && !interaction.replied) {
							logger.warn(
								{ command: { name: interaction.commandName, type: interaction.type }, userId: interaction.user.id },
								"Command interaction has not been deferred before throwing",
							);
							await interaction.deferReply({
								ephemeral: true,
							});
						}

						await interaction.editReply({ content: error.message, components: [], allowedMentions: { parse: [] } });
					} catch (error_) {
						const error = error_ as Error;
						logger.error(error, error.message);
					}
				}
			}
		});
	}
}

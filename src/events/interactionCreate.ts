import { ApplicationCommandType, Events, Client } from "discord.js";
import { injectable, inject } from "tsyringe";
import type { Component } from "../Component.js";
import type { Event } from "../Event.js";
import { transformInteraction } from "../interactions/InteractionOptions.js";
import { kCommands, kComponents } from "../tokens.js";
import type { createCommands } from "../util/commands.js";
import { logger } from "../util/logger.js";

@injectable()
export default class implements Event {
	public name = "Interaction handling";

	public event = Events.InteractionCreate as const;

	public constructor(
		public readonly client: Client<true>,
		@inject(kCommands) public readonly commands: ReturnType<typeof createCommands>,
		@inject(kComponents) public readonly components: Map<string, Component>,
	) {}

	public execute() {
		this.client.on(this.event, async (interaction) => {
			if (
				!interaction.isCommand() &&
				!interaction.isUserContextMenuCommand() &&
				!interaction.isMessageContextMenuCommand() &&
				!interaction.isAutocomplete() &&
				!interaction.isModalSubmit()
			) {
				return;
			}

			if (!interaction.inCachedGuild()) {
				return;
			}

			if (interaction.isModalSubmit()) {
				const component = this.components.get(interaction.customId.toLowerCase());
				if (component) {
					await component.execute(interaction, null, "en");
				} else {
					await interaction.reply({
						content: `\`🐛\`No handler found for component \`${interaction.customId.toLowerCase()}\``,
						ephemeral: true,
					});
				}

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
								await command.autocomplete(interaction, transformInteraction(interaction.options.data));
								break;
							} else {
								await command.chatInput(interaction, transformInteraction(interaction.options.data));
								break;
							}
						}

						case ApplicationCommandType.Message: {
							logger.info(
								{ command: { name: interaction.commandName, type: interaction.type }, userId: interaction.user.id },
								`Executing message context command ${interaction.commandName}`,
							);

							await command.messageContext(interaction, transformInteraction(interaction.options.data));
							break;
						}

						case ApplicationCommandType.User: {
							logger.info(
								{ command: { name: interaction.commandName, type: interaction.type }, userId: interaction.user.id },
								`Executing user context command ${interaction.commandName}`,
							);

							await command.userContext(interaction, transformInteraction(interaction.options.data));
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

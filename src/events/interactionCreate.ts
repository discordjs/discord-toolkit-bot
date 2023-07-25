import { transformInteraction, kCommands, type CommandMap, logger } from "@yuudachi/framework";
import type { Event } from "@yuudachi/framework/types";
import { ApplicationCommandType, Events, Client, PermissionFlagsBits, ButtonStyle, ComponentType } from "discord.js";
import { injectable, inject } from "tsyringe";
import { CUSTOM_ID_SEPARATOR } from "../util/constants.js";

@injectable()
export default class implements Event {
	public name = "Interaction handling";

	public event = Events.InteractionCreate as const;

	public constructor(public readonly client: Client<true>, @inject(kCommands) public readonly commands: CommandMap) {}

	public execute() {
		this.client.on(this.event, async (interaction) => {
			if (!interaction.inCachedGuild()) {
				return;
			}

			if (interaction.isButton()) {
				try {
					const [idPrefix] = interaction.customId.split(CUSTOM_ID_SEPARATOR);
					switch (idPrefix) {
						case "solved": {
							const { channel, member, channelId } = interaction;
							if (!channel?.isThread()) {
								return;
							}

							if (
								channel.ownerId !== interaction.user.id &&
								!member.permissionsIn(channelId).has(PermissionFlagsBits.ManageMessages)
							) {
								await interaction.reply({
									ephemeral: true,
									content: "Only the original poster or support staff can mark a post as resolved!",
								});
								return;
							}

							await interaction.update({
								components: [
									{
										type: ComponentType.ActionRow,
										components: [
											{
												type: ComponentType.Button,
												customId: "solved",
												style: ButtonStyle.Secondary,
												label: "Resolved",
												emoji: "🔒",
												disabled: true,
											},
										],
									},
								],
							});

							await channel.edit({
								locked: true,
								archived: true,
							});

							break;
						}

						default:
							break;
					}
				} catch (error_) {
					const error = error_ as Error;
					logger.error(error, error.message);
				}
			}

			if (
				!interaction.isCommand() &&
				!interaction.isUserContextMenuCommand() &&
				!interaction.isMessageContextMenuCommand() &&
				!interaction.isAutocomplete()
			) {
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

import { ApplicationCommandType } from "discord.js";

export const FormatContextCommand = {
    type: ApplicationCommandType.Message,
    name: "Format code",
} as const;
import { ApplicationCommandType } from "discord.js";

export const UserInfoContextCommand = {
	type: ApplicationCommandType.User,
	name: "Userinfo",
} as const;

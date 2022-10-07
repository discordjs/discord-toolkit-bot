import { ApplicationCommandType } from 'discord.js';

export const UserinfoContextCommand = {
	type: ApplicationCommandType.User,
	name: 'Userinfo',
} as const;

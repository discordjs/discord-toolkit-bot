import { Command } from "@yuudachi/framework";
import type { InteractionParam, CommandMethod, ArgsParam } from "@yuudachi/framework/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import utc from "dayjs/plugin/utc.js";
import {
	type TimestampStylesString,
	type APIEmbed,
	type GuildMember,
	inlineCode,
	italic,
	type User,
	time,
	TimestampStyles,
	ApplicationFlagsBitField,
} from "discord.js";
import kleur from "kleur";
import type { UserInfoContextCommand } from "../interactions/context/userinfoContext.js";
import type { UserInfoCommand } from "../interactions/slash/userinfo.js";
import { EMOJI_NEWBIE, TAB, Colors } from "../util/constants.js";
import { formatUserFlag, formatApplicationFlag } from "../util/formatting.js";
import { truncateEmbed } from "../util/index.js";

kleur.enabled = true;

dayjs.extend(relativeTime);
dayjs.extend(utc);

type ApplicationRPC = {
	bot_public: boolean;
	bot_require_code_grant: boolean;
	description: string;
	flags: number;
	hook: boolean;
	icon: string;
	id: string;
	name: string;
	summary: string;
	tags: string[];
};

function timeFromTimestamp(timestamp: number, format: TimestampStylesString) {
	return time(dayjs(timestamp).unix(), format);
}

export function applyMemberInfo(embed: APIEmbed, member: GuildMember): string[] {
	const notices = [];
	const memberInfo: string[] = [
		`Joined: ${timeFromTimestamp(member.joinedTimestamp ?? 0, TimestampStyles.ShortDateTime)} (${timeFromTimestamp(
			member.joinedTimestamp ?? 0,
			TimestampStyles.RelativeTime,
		)})`,
	];

	if (member.avatar) {
		memberInfo.push(`Guild avatar: [${member.avatar}](${member.avatarURL({ extension: "png", size: 2_048 })})`);
	}

	if (member.roles.color) {
		memberInfo.push(`Color role: ${inlineCode(member.roles.color.name)} (${inlineCode(member.displayHexColor)})`);
	}

	if (member.roles.hoist) {
		memberInfo.push(`Hoist role: ${inlineCode(member.roles.hoist.name)}`);
	}

	if (member.roles.icon) {
		embed.footer = {
			icon_url: member.roles.icon.iconURL({ extension: "png", size: 2_048 })!,
			text: member.roles.icon.name,
		};

		memberInfo.push(`Icon role: ${inlineCode(member.roles.icon.name)}`);
	}

	if (member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > Date.now()) {
		notices.push(
			`🔇 Timeout until: ${timeFromTimestamp(
				member.communicationDisabledUntilTimestamp,
				TimestampStyles.ShortDateTime,
			)} (${timeFromTimestamp(member.communicationDisabledUntilTimestamp, TimestampStyles.RelativeTime)})`,
		);
	}

	if (member.nickname) {
		memberInfo.push(`Nickname: ${inlineCode(member.nickname)}`);
	}

	if (member.premiumSinceTimestamp) {
		memberInfo.push(
			`Boosting since: ${timeFromTimestamp(
				member.premiumSinceTimestamp,
				TimestampStyles.ShortDateTime,
			)} (${timeFromTimestamp(member.premiumSinceTimestamp, TimestampStyles.RelativeTime)})`,
		);
	}

	if (member.id === member.guild.ownerId) {
		notices.push("Owner of this guild");
	}

	if (Date.now() - (member.joinedTimestamp ?? 0) < 1_000 * 60 * 60 * 24 * 7) {
		notices.push(`${EMOJI_NEWBIE} New member`);
	}

	if (member.roles.cache.size > 1) {
		memberInfo.push(
			`Roles (${member.roles.cache.size - 1}):\n${TAB}${member.roles.cache
				.filter((role) => role.id !== role.guild.roles.everyone.id)
				.sorted((a, b) => b.rawPosition - a.rawPosition)
				.reduce((accumulator: string[], current) => {
					return [...accumulator, italic(`<@&${current.id}>`)];
				}, [])
				.join(", ")}`,
		);
	}

	embed.fields = [
		...(embed.fields ?? []),
		{
			name: "Member info",
			value: memberInfo.map((part) => `• ${part}`).join("\n"),
		},
	];

	if (member.displayColor) {
		embed.color = member.displayColor;
	}

	embed.thumbnail = {
		url: member.displayAvatarURL({ extension: "png", size: 2_048 }),
	};

	if (member.pending) {
		notices.push(`ℹ️ Membership pending`);
	}

	return notices;
}

export async function applyUserInfo(embed: APIEmbed, user: User): Promise<string[]> {
	const notices: string[] = [];
	await user.fetch(true);
	const userInfo: string[] = [
		`Name: ${user.toString()}  ${inlineCode(user.tag)}`,
		`ID: ${inlineCode(user.id)}`,
		`Created: ${timeFromTimestamp(user.createdTimestamp, TimestampStyles.ShortDateTime)} (${timeFromTimestamp(
			user.createdTimestamp,
			TimestampStyles.RelativeTime,
		)})`,
	];

	if (user.avatar) {
		userInfo.push(`Avatar: [${user.avatar}](${user.avatarURL({ extension: "png", size: 2_048 })})`);
	}

	const bannerURL = user.bannerURL({ extension: "png", size: 2_048 });
	if (bannerURL && user.banner) {
		userInfo.push(`Banner: [${user.banner}](${bannerURL})`);
	}

	embed.thumbnail = {
		url: user.displayAvatarURL({ extension: "png", size: 2_048 }),
	};

	if (user.bot) {
		notices.push("Bot application");
	}

	if (user.flags?.bitfield) {
		const flagStrings: string[] = user.flags.toArray().map((flagName) => italic(formatUserFlag(flagName)));

		userInfo.push(`Badges:\n${TAB}${flagStrings.join(", ")}`);
	}

	embed.fields = [
		...(embed.fields ?? []),
		{
			name: "User info",
			value: userInfo.map((info) => `• ${info}`).join("\n"),
		},
	];

	return notices;
}

export async function applyApplicationInfo(embed: APIEmbed, user: User) {
	try {
		const res = (await user.client.rest.get(`/applications/${user.id}/rpc`)) as ApplicationRPC;
		const info: string[] = [];

		info.push(`${res.bot_public ? "Bot is **public**" : "Bot is **private**"}`);
		info.push(
			`${res.bot_require_code_grant ? "Bot **requires** OAuth2 grant" : "Bot **does not require** OAuth2 grant"}`,
		);

		const flags = new ApplicationFlagsBitField(res.flags).toArray().map((flagName) => formatApplicationFlag(flagName));

		if (flags.length) {
			info.push(...flags);
		}

		if (res.description.length) {
			embed.fields = [
				...(embed.fields ?? []),
				{
					name: "App Description",
					value: res.description,
				},
			];
		}

		if (res.summary.length) {
			embed.fields = [
				...(embed.fields ?? []),
				{
					name: "App Summary",
					value: res.summary,
				},
			];
		}

		if (info.length) {
			embed.fields = [
				...(embed.fields ?? []),
				{
					name: "App Info",
					value: info.map((line) => `• ${line}`).join("\n"),
				},
			];
		}

		return [];
	} catch {
		return [];
	}
}

export default class extends Command<typeof UserInfoCommand> {
	private async handle(
		interaction: InteractionParam | InteractionParam<CommandMethod.UserContext>,
		args: ArgsParam<typeof UserInfoCommand | typeof UserInfoContextCommand>,
	): Promise<void> {
		const embed: APIEmbed = {
			color: Colors.Dark,
		};

		await interaction.deferReply({
			ephemeral: true,
		});

		const notices = await applyUserInfo(embed, args.user.user);

		if (args.user.member) {
			const memberNotices = applyMemberInfo(embed, args.user.member);
			notices.push(...memberNotices);
		}

		if (args.user.user.bot) {
			await applyApplicationInfo(embed, args.user.user);
		}

		if (notices.length) {
			embed.fields = [
				...(embed.fields ?? []),
				{
					name: "Notices",
					value: notices.map((notice) => `• ${notice}`).join("\n"),
				},
			];
		}

		await interaction.editReply({
			embeds: [truncateEmbed(embed)],
		});
	}

	public override async chatInput(
		interaction: InteractionParam,
		args: ArgsParam<typeof UserInfoCommand>,
	): Promise<void> {
		await this.handle(interaction, args);
	}

	public override async userContext(
		interaction: InteractionParam<CommandMethod.UserContext>,
		args: ArgsParam<typeof UserInfoContextCommand>,
	): Promise<void> {
		await this.handle(interaction, args);
	}
}

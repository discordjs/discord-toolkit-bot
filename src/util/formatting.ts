import type { ApplicationFlags, UserFlags } from "discord.js";

export function formatUserFlag(flag: keyof typeof UserFlags) {
	switch (flag) {
		case "BotHTTPInteractions":
			return "Bot Interaction";
		case "BugHunterLevel1":
			return "Bug Hunter";
		case "BugHunterLevel2":
			return "Bug Hunter (gold)";
		case "PremiumEarlySupporter":
			return "Early Supporter";
		case "CertifiedModerator":
			return "Certified Moderator";
		case "HypeSquadOnlineHouse1":
			return "House Bravery";
		case "HypeSquadOnlineHouse2":
			return "House Brilliance";
		case "HypeSquadOnlineHouse3":
			return "House Balance";
		case "VerifiedBot":
			return "Discord application (verified)";
		case "Hypesquad":
			return "Hypesquad Events";
		case "Partner":
			return "Discord Partner";
		case "VerifiedDeveloper":
			return "Early verified developer";
		default:
			return flag;
	}
}

export function formatApplicationFlag(flag: keyof typeof ApplicationFlags) {
	switch (flag) {
		case "ApplicationCommandBadge":
			return "Application Command Badge";
		case "Embedded":
			return "Embedded";
		case "EmbeddedFirstParty":
			return "Embedded First Party";
		case "EmbeddedReleased":
			return "Embedded Released";
		case "GatewayGuildMembers":
			return "App has `GuildMembers` intent";
		case "GatewayGuildMembersLimited":
			return "App has `GuildMembers` intent (limited)";
		case "GatewayMessageContent":
			return "App has `MessageContent` intent";
		case "GatewayMessageContentLimited":
			return "App has `MessageContent` intent (limited)";
		case "GatewayPresence":
			return "App has `Presence` intent";
		case "GatewayPresenceLimited":
			return "App has `Presence` intent (limited)";
		case "GroupDMCreate":
			return "App can create Group DMs";
		case "ManagedEmoji":
			return "App can manage Emoji";
		case "RPCHasConnected":
			return "RPC has connected";
		case "VerificationPendingGuildLimit":
			return "Verification is pending (guild limit applies)";
		default:
			return flag;
	}
}

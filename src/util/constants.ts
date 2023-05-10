export enum Colors {
	White = 0xffffff,
	Red = 0xff5c5c,
	Orange = 0xf79454,
	Yellow = 0xffdb5c,
	Green = 0x5cff9d,
	Blue = 0x5c6cff,
	Pink = 0xb75cff,
	Dark = 0x2f3136,
	DiscordSuccess = 0x3ba55d,
	DiscordDanger = 0xed4245,
}

export const DATE_FORMAT_LOGFILE = "YYYY-MM-DD_HH-mm-ss";
export const DATE_FORMAT_WITH_SECONDS = "YYYY/MM/DD HH:mm:ss";

export const DISCORD_USER_FLAG_SPAMMER = 1 << 20;

export const TAB = "\u200B \u200B \u200B" as const;

export const EMOJI_NEWBIE = "<:newbie:962332319623049226>" as const;
export const ASSISTCHANNELS = ["986520997006032896", "998942774994927646"];

export const V14_SUPPORT_CHANNEL = "824411059443204127" as const;
export const V13_SUPPORT_CHANNEL = "874431116533178459" as const;
export const V14_QUESTIONS_FORUM_TAGS = ["1104357298865975336", "1102636409199792230"];
export const V13_QUESTIONS_FORUM_TAGS = ["1104357856603557930", "1093890587599573043"];

export enum DiscordJSVersion {
	V13 = "v13",
	V14 = "v14",
}

export const URL_REGEX =
	/(?<url>https?:\/\/(?:www\.|(?!www))[\dA-Za-z][\dA-Za-z-]+[\dA-Za-z]\.\S{2,}|www\.[\dA-Za-z][\dA-Za-z-]+[\dA-Za-z]\.\S{2,}|https?:\/\/(?:www\.|(?!www))[\dA-Za-z]+\.\S{2,}|www\.[\dA-Za-z]+\.\S{2,})/g;

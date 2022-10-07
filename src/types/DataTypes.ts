export type GuildMetrics = {
	guild_ban_add_count: number;
	guild_id: string;
	guild_member_add_count: number;
	guild_member_update_count: number;
	message_create_count: number;
};

export type ChannelMetrics = {
	channel_id: string;
	guild_id: string;
	message_create_count: number;
};

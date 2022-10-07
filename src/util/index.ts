import type { APIEmbed } from "discord.js";

export const LIMIT_EMBED_DESCRIPTION = 4_048 as const;
export const LIMIT_EMBED_TITLE = 256 as const;
export const LIMIT_EMBED_FIELDS = 25 as const;
export const LIMIT_EMBED_FIELD_NAME = 256 as const;
export const LIMIT_EMBED_FIELD_VALUE = 1_024 as const;
export const LIMIT_EMBED_AUTHOR_NAME = 256 as const;
export const LIMIT_EMBED_FOOTER_TEXT = 2_048 as const;

/**
 * Truncate a text to a provided length using a provided splitcharacter
 *
 * @param text - Text to truncate
 * @param len - Length to truncate to
 * @param splitChar - Split character to use
 * @returns The truncated text
 */
export function truncate(text: string, len: number, splitChar = " "): string {
	if (text.length <= len) return text;
	const words = text.split(splitChar);
	const res: string[] = [];
	for (const word of words) {
		const full = res.join(splitChar);
		if (full.length + word.length + 1 <= len - 3) {
			res.push(word);
		}
	}

	const resText = res.join(splitChar);
	return resText.length === text.length ? resText : `${resText.trim()}...`;
}

/**
 * Truncate the provided embed
 *
 * @param embed - The embed to truncate
 * @returns The truncated embed
 */
export function truncateEmbed(embed: APIEmbed): APIEmbed {
	return {
		url: embed.url,
		description: embed.description ? truncate(embed.description, LIMIT_EMBED_DESCRIPTION) : undefined,
		color: embed.color,
		title: embed.title ? truncate(embed.title, LIMIT_EMBED_TITLE) : undefined,
		thumbnail: embed.thumbnail
			? {
					url: embed.thumbnail.url,
			  }
			: undefined,
		image: embed.image
			? {
					url: embed.image.url,
			  }
			: undefined,
		timestamp: embed.timestamp ?? undefined,
		fields: embed.fields?.slice(0, LIMIT_EMBED_FIELDS).map((field) => ({
			name: truncate(field.name, LIMIT_EMBED_FIELD_NAME),
			value: truncate(field.value, LIMIT_EMBED_FIELD_VALUE),
			inline: field.inline,
		})),
		author: embed.author
			? {
					name: truncate(embed.author.name, LIMIT_EMBED_AUTHOR_NAME),
					icon_url: embed.author.icon_url,
					url: embed.author.url,
			  }
			: undefined,
		footer: embed.footer
			? {
					text: truncate(embed.footer.text, LIMIT_EMBED_FOOTER_TEXT),
					icon_url: embed.footer.icon_url,
			  }
			: undefined,
	};
}

import type { WebhookClient } from "discord.js";
import { container } from "tsyringe";
import { kWebhooks } from "../tokens.js";

export function createWebhooks() {
	const webhooks = new Map<symbol, WebhookClient>();

	container.register(kWebhooks, { useValue: webhooks });

	return webhooks;
}

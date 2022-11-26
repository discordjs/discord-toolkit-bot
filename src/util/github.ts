import { setInterval } from "node:timers";
import { logger } from "@yuudachi/framework";
import { Collection, type InteractionReplyOptions } from "discord.js";
import { container } from "tsyringe";
import { kGitHubCache } from "../tokens.js";

const GITHUB_CACHE_SWEEP_INTERVAL = 60 * 60 * 1_000;
const GITHUB_CACHE_MAX_AGE = 10 * 60 * 1_000;

export type GitHubCacheEntry = {
	lastUsed: number;
	payloads: InteractionReplyOptions[];
};

export function createGithubCache() {
	const cache = new Collection<string, GitHubCacheEntry>();

	container.register(kGitHubCache, { useValue: cache });

	setInterval(sweepGithubCache, GITHUB_CACHE_SWEEP_INTERVAL);
	logger.info(`Created GitHub cache with sweep interval of ${GITHUB_CACHE_SWEEP_INTERVAL}ms`);

	return cache;
}

export function sweepGithubCache() {
	const cache = container.resolve<Collection<string, GitHubCacheEntry>>(kGitHubCache);

	const sweeped = cache.sweep((value) => value.lastUsed + GITHUB_CACHE_MAX_AGE < Date.now());

	logger.info({ msg: `Swept ${sweeped} entries from GitHub cache`, sweeped, cacheSize: cache.size });
}

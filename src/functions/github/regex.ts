/* eslint-disable unicorn/no-unsafe-regex */
export const NormalGitHubUrlRegex =
	/https:\/\/github\.com\/(?<org>.+?)\/(?<repo>.+?)\/(?:(?:blob)|(?:blame))(?<path>\/[^\s#>]+)(?<opts>[^\s>]+)?/;

export const GistGitHubUrlRegex = /https:\/\/gist\.github\.com\/(?<user>.+?)\/(?<id>[^\s#>]+)#file-(?<opts>[^\s>]+)/;

export const GitHubUrlLinesRegex = /[#-]?[LR](?<start>(?:\d|[^\n->])+)?(?:-[LR](?<end>\d+))?/;

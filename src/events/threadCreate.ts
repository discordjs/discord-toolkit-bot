import { setTimeout as wait } from 'node:timers/promises';
import { Events, Client } from 'discord.js';
import { injectable } from 'tsyringe';
import type { Event } from '../Event.js';

const ASSISTCHANNELS = ['986520997006032896', '998942774994927646'];

@injectable()
export default class implements Event {
	public name = 'Support enquiry';

	public event = Events.ThreadCreate as const;

	public constructor(public readonly client: Client<true>) {}

	public execute() {
		this.client.on(this.event, async (thread, newlyCreated) => {
			await wait(2_000);
			if (!newlyCreated || !ASSISTCHANNELS.includes(thread.parentId ?? '')) return;

			await thread.send({
				content: [
					"• What's your exact discord.js `npm list discord.js` and node `node -v` version?",
					'• Post the full error stack trace, not just the top part!',
					'• Show your code!',
					'• Explain what exactly your issue is.',
					'• Not a discord.js issue? Check out <#237743386864517122>.',
				].join('\n'),
			});
		});
	}
}

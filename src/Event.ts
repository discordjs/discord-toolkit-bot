export type Event = {
	disabled?: boolean;
	event: string;
	execute(...args: any): Promise<unknown> | unknown;
	name: string;
};

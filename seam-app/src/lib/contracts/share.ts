import { z } from 'zod';
import { MOODS } from './intake';
import { ShareSlotSchema } from './meeting';

export const ShareRequestSchema = z.object({
	speakerId: z.string().min(1).max(20),
	slot: ShareSlotSchema,
	topic: z.string().max(120).nullable(),
	userName: z.string().trim().min(1).max(40),
	userMood: z.enum(MOODS),
	n: z.number().int().nonnegative(),
	recent: z
		.array(z.object({ speaker: z.string().max(40), text: z.string().max(1200) }))
		.max(8)
});
export type ShareRequest = z.infer<typeof ShareRequestSchema>;

export const ShareResponseSchema = z.object({
	text: z.string().min(1),
	source: z.enum(['grok', 'tape'])
});
export type ShareResponse = z.infer<typeof ShareResponseSchema>;

import { z } from 'zod';
import { IntakeSchema } from './intake';

export const SHARE_SLOTS = [
	'opening',
	'reading',
	'topic',
	'round',
	'hard_question',
	'closing',
	'farewell'
] as const;
export const ShareSlotSchema = z.enum(SHARE_SLOTS);
export type ShareSlot = z.infer<typeof ShareSlotSchema>;

export const USER_TURNS = ['intro', 'topic', 'share'] as const;
export type UserTurn = (typeof USER_TURNS)[number];

export const BeatSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('ritual'), text: z.string().min(1) }),
	z.object({ kind: z.literal('action'), text: z.string().min(1) }),
	z.object({ kind: z.literal('intro'), speakerId: z.string().min(1) }),
	z.object({
		kind: z.literal('share'),
		speakerId: z.string().min(1),
		slot: ShareSlotSchema,
		onlyIfUserShared: z.boolean().optional()
	}),
	z.object({
		kind: z.literal('user_turn'),
		turn: z.enum(USER_TURNS),
		prompt: z.string().min(1)
	}),
	z.object({ kind: z.literal('end') })
]);
export type Beat = z.infer<typeof BeatSchema>;

export const TranscriptEntrySchema = z.object({
	id: z.string().min(1),
	kind: z.enum(['ritual', 'action', 'share', 'user', 'crisis', 'phone_list']),
	speakerId: z.string().nullable(),
	text: z.string(),
	source: z.enum(['grok', 'tape', 'authored']).optional()
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export const MeetingStateSchema = z.object({
	version: z.literal(1),
	slipNumber: z.number().int().nonnegative(),
	startedAt: z.string(),
	seed: z.number().int().nonnegative(),
	intake: IntakeSchema,
	topic: z.string().nullable(),
	cursor: z.number().int().nonnegative(),
	transcript: z.array(TranscriptEntrySchema),
	crisis: z.boolean(),
	finished: z.boolean()
});
export type MeetingState = z.infer<typeof MeetingStateSchema>;

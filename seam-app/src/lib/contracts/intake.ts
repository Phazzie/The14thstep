import { z } from 'zod';

export const MOODS = [
	'anxious',
	'hopeful',
	'angry',
	'numb',
	'grateful',
	'burned out',
	'restless',
	'ashamed'
] as const;

export const IntakeSchema = z.object({
	name: z.string().trim().min(1).max(40),
	cleanTime: z.string().trim().min(1).max(40),
	mood: z.enum(MOODS),
	mind: z.string().trim().min(1).max(600),
	listeningOnly: z.boolean()
});

export type Intake = z.infer<typeof IntakeSchema>;

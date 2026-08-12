import { z } from "zod";

export const noteSchema = z.object({
  title: z
    .string({ error: "Le titre est requis" })
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(100, "Le titre ne doit pas dépasser 100 caractères"),
  emoji: z.string({ error: "Un emoji est requis" }),
  content: z.any(),
  memberIds: z.array(z.number()).default([]),
  mentionMembers: z.boolean().default(true),
  pin: z.boolean().default(false),
});

export type TNoteSchema = z.infer<typeof noteSchema>;

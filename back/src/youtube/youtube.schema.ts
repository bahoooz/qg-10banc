import { z } from "zod";

export const youtubePrivacyStatusSchema = z.enum([
  "public",
  "unlisted",
  "private",
]);

export const publishYouTubeVideoSchema = z.object({
  accountId: z.string().uuid(),
  videoUrl: z.string().url(),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(5000).default(""),
  privacyStatus: youtubePrivacyStatusSchema,
  categoryId: z.string().regex(/^\d+$/).default("22"),
  tags: z.array(z.string().trim().min(1).max(100)).max(15).optional(),
  selfDeclaredMadeForKids: z.boolean(),
  includeShortsTag: z.boolean().default(true),
});

export type PublishYouTubeVideoInput = z.infer<typeof publishYouTubeVideoSchema>;

export type YouTubePrivacyStatus = z.infer<typeof youtubePrivacyStatusSchema>;

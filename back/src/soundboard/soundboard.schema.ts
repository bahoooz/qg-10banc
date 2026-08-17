import { z } from "zod";

export const soundboardSearchQuerySchema = z.object({
  q: z.string().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).optional().default(60),
});

import z from "zod";

export const passwordSchema = z.object({
  password: z
    .string({ error: "Le mot de passe est requis" })
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string({ error: "Le nom d'utilisateur est requis" })
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(20, "Le nom d'utilisateur ne doit pas dépasser 20 caractères"),
  email: z.string({ error: "L'email est requis" }),
  password: z
    .string({ error: "Le mot de passe est requis" })
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export type TSignupSchema = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  username: z
    .string({ error: "Le nom d'utilisateur est requis" })
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(20, "Le nom d'utilisateur ne doit pas dépasser 20 caractères"),
  password: z
    .string({ error: "Le mot de passe est requis" })
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export type TLoginSchema = z.infer<typeof loginSchema>;

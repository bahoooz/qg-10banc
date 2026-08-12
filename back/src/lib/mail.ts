import { Resend } from "resend";
import { AppError } from "../../utils.js";
import { getFrontendUrl } from "../config/env.js";

// Initialisation avec la clé API de ton .env
const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY)
  throw new AppError(500, "ENVIRONMENT_VARIABLE_NOT_FOUND");

export const mailService = {
  /**
   * Envoi d'un mail de bienvenue
   */
  mentionMembersNote: async ({
    emails,
    noteTitle,
    author,
    slug,
  }: {
    emails: string[];
    noteTitle: string;
    author: string;
    slug: string;
  }) => {
    return await resend.emails.send({
      from: "Notifications - 10banc <notifications@10banc.com>",
      to: emails,
      subject: `${author} vous a été mentionné dans une nouvelle note 10banc`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>Nouvelle mention sur 10banc</h2>
          <p><strong>${author}</strong> vous a ajouté à la note : <strong>${noteTitle}</strong>.</p>
          <a href="${getFrontendUrl()}/notes/view/${slug}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Voir la note
          </a>
        </div>
      `,
    });
  },
};

import { google } from "googleapis";

export const getAuthClient = () => {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!redirectUri)
    throw new Error("GOOGLE_REDIRECT_URI n'est pas défini dans .env");

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

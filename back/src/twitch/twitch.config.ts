export const TWITCH_CONFIG = {
  CLIENT_ID: process.env.TWITCH_CLIENT_ID ?? "",
  CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET ?? "",
  REDIRECT_URI: process.env.TWITCH_REDIRECT_URI ?? "",
  SCOPES: ["channel:manage:clips", "editor:manage:clips"],
  ENDPOINTS: {
    AUTHORIZE: "https://id.twitch.tv/oauth2/authorize",
    TOKEN: "https://id.twitch.tv/oauth2/token",
    HELIX: "https://api.twitch.tv/helix",
  },
} as const;

export function assertTwitchOAuthConfig(): void {
  if (!TWITCH_CONFIG.CLIENT_ID || !TWITCH_CONFIG.CLIENT_SECRET) {
    throw new Error(
      "TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET sont requis dans le .env",
    );
  }

  if (!TWITCH_CONFIG.REDIRECT_URI) {
    throw new Error("TWITCH_REDIRECT_URI est requis dans le .env");
  }
}

-- CreateTable
CREATE TABLE "TwitchAccount" (
    "id" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "displayName" TEXT,
    "avatar" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwitchAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwitchAccount_twitchUserId_key" ON "TwitchAccount"("twitchUserId");

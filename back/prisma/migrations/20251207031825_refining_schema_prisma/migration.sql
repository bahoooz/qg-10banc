/*
  Warnings:

  - You are about to drop the column `channelId` on the `DailyStat` table. All the data in the column will be lost.
  - You are about to drop the column `subscribers` on the `DailyStat` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `TikTokAccount` table. All the data in the column will be lost.
  - You are about to drop the column `followerCount` on the `TikTokAccount` table. All the data in the column will be lost.
  - You are about to drop the column `likesCount` on the `TikTokAccount` table. All the data in the column will be lost.
  - You are about to drop the column `videoCount` on the `TikTokAccount` table. All the data in the column will be lost.
  - You are about to drop the `YouTubeChannel` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[youtubeAccountId,date]` on the table `DailyStat` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tikTokAccountId,date]` on the table `DailyStat` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DailyStat" DROP CONSTRAINT "DailyStat_channelId_fkey";

-- DropIndex
DROP INDEX "DailyStat_channelId_date_key";

-- AlterTable
ALTER TABLE "DailyStat" DROP COLUMN "channelId",
DROP COLUMN "subscribers",
ADD COLUMN     "comments" INTEGER DEFAULT 0,
ADD COLUMN     "followers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "likes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shares" INTEGER DEFAULT 0,
ADD COLUMN     "tikTokAccountId" TEXT,
ADD COLUMN     "youtubeAccountId" TEXT;

-- AlterTable
ALTER TABLE "TikTokAccount" DROP COLUMN "avatarUrl",
DROP COLUMN "followerCount",
DROP COLUMN "likesCount",
DROP COLUMN "videoCount",
ADD COLUMN     "avatar" TEXT;

-- DropTable
DROP TABLE "YouTubeChannel";

-- CreateTable
CREATE TABLE "YouTubeAccount" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "avatar" TEXT,
    "customUrl" TEXT,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeAccount_channelId_key" ON "YouTubeAccount"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_youtubeAccountId_date_key" ON "DailyStat"("youtubeAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_tikTokAccountId_date_key" ON "DailyStat"("tikTokAccountId", "date");

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_youtubeAccountId_fkey" FOREIGN KEY ("youtubeAccountId") REFERENCES "YouTubeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_tikTokAccountId_fkey" FOREIGN KEY ("tikTokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "YouTubeChannel" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "avatar" TEXT,
    "customUrl" TEXT,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "subscribers" INTEGER NOT NULL DEFAULT 0,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeChannel_channelId_key" ON "YouTubeChannel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_channelId_date_key" ON "DailyStat"("channelId", "date");

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "YouTubeChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

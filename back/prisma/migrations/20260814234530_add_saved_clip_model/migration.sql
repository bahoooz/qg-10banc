-- CreateTable
CREATE TABLE "SavedClip" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "originalName" TEXT,
    "sourceWidth" INTEGER NOT NULL,
    "sourceHeight" INTEGER NOT NULL,
    "sourceDuration" DOUBLE PRECISION NOT NULL,
    "editorState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedClip_userId_idx" ON "SavedClip"("userId");

-- CreateIndex
CREATE INDEX "SavedClip_clipId_idx" ON "SavedClip"("clipId");

-- CreateIndex
CREATE INDEX "SavedClip_createdAt_idx" ON "SavedClip"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedClip_userId_name_key" ON "SavedClip"("userId", "name");

-- AddForeignKey
ALTER TABLE "SavedClip" ADD CONSTRAINT "SavedClip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

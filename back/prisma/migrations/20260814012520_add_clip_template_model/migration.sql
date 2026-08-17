-- CreateTable
CREATE TABLE "ClipTemplate" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClipTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClipTemplate_userId_idx" ON "ClipTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClipTemplate_userId_name_key" ON "ClipTemplate"("userId", "name");

-- AddForeignKey
ALTER TABLE "ClipTemplate" ADD CONSTRAINT "ClipTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

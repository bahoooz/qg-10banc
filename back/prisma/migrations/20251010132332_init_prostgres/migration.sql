-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'tiktok',
    "operationId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "isPosted" BOOLEAN DEFAULT false,
    "prompt" TEXT NOT NULL,
    "uri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_operationId_key" ON "Video"("operationId");

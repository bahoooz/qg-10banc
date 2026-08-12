/*
  Warnings:

  - A unique constraint covering the columns `[title]` on the table `Note` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "mentionMembers" SET DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Note_title_key" ON "Note"("title");

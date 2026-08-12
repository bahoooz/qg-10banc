/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Note` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Note_slug_key" ON "Note"("slug");

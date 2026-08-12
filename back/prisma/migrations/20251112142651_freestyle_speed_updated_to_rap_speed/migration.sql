/*
  Warnings:

  - You are about to drop the column `freestyleSpeed` on the `Prompt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Prompt" DROP COLUMN "freestyleSpeed",
ADD COLUMN     "rapSpeed" TEXT NOT NULL DEFAULT 'fastNervous';

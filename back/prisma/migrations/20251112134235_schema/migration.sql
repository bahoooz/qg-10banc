/*
  Warnings:

  - Added the required column `habit` to the `Prompt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `place` to the `Prompt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rapText` to the `Prompt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "animal" TEXT,
ADD COLUMN     "freestyleSpeed" TEXT NOT NULL DEFAULT 'fastNervous',
ADD COLUMN     "habit" TEXT NOT NULL,
ADD COLUMN     "instrumentalFlow" TEXT NOT NULL DEFAULT 'nervous',
ADD COLUMN     "intro" TEXT NOT NULL DEFAULT 'Génère une grand-mère française de 100 ans',
ADD COLUMN     "place" TEXT NOT NULL,
ADD COLUMN     "rapText" TEXT NOT NULL,
ALTER COLUMN "prompt" DROP DEFAULT;

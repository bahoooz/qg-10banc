/*
  Warnings:

  - A unique constraint covering the columns `[uri]` on the table `Video` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[url_link]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "url_link" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Video_uri_key" ON "Video"("uri");

-- CreateIndex
CREATE UNIQUE INDEX "Video_url_link_key" ON "Video"("url_link");

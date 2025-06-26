/*
  Warnings:

  - You are about to drop the column `topic` on the `Material` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Material" DROP COLUMN "topic",
ADD COLUMN     "topics" TEXT[];

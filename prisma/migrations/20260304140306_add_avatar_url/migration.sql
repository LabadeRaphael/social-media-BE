/*
  Warnings:

  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Profile" DROP CONSTRAINT "Profile_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarUrl" TEXT;

-- DropTable
DROP TABLE "public"."Profile";

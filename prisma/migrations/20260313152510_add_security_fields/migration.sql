-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "authLockedUntil" TIMESTAMP(3),
ADD COLUMN     "failedAuthAttemps" INTEGER NOT NULL DEFAULT 0;

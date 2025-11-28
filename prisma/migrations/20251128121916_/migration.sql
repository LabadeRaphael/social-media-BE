/*
  Warnings:

  - The values [IMAGE,FILE] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."MessageType_new" AS ENUM ('TEXT', 'VOICE', 'DOCUMENT');
ALTER TABLE "public"."Message" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."Message" ALTER COLUMN "type" TYPE "public"."MessageType_new" USING ("type"::text::"public"."MessageType_new");
ALTER TYPE "public"."MessageType" RENAME TO "MessageType_old";
ALTER TYPE "public"."MessageType_new" RENAME TO "MessageType";
DROP TYPE "public"."MessageType_old";
ALTER TABLE "public"."Message" ALTER COLUMN "type" SET DEFAULT 'TEXT';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT;

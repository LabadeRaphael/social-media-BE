/*
  Warnings:

  - You are about to drop the column `tokenHash` on the `PasswordResetToken` table. All the data in the column will be lost.
  - Added the required column `hashedPswToken` to the `PasswordResetToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."PasswordResetToken_userId_tokenHash_idx";

-- AlterTable
ALTER TABLE "public"."PasswordResetToken" DROP COLUMN "tokenHash",
ADD COLUMN     "hashedPswToken" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_hashedPswToken_idx" ON "public"."PasswordResetToken"("userId", "hashedPswToken");

/*
  Warnings:

  - A unique constraint covering the columns `[hashedPswToken]` on the table `PasswordResetToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_hashedPswToken_key" ON "public"."PasswordResetToken"("hashedPswToken");

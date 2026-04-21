-- CreateTable
CREATE TABLE "public"."EmailChangeToken" (
    "id" TEXT NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_hashedToken_key" ON "public"."EmailChangeToken"("hashedToken");

-- CreateIndex
CREATE INDEX "EmailChangeToken_userId_hashedToken_idx" ON "public"."EmailChangeToken"("userId", "hashedToken");

-- AddForeignKey
ALTER TABLE "public"."EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

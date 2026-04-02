-- CreateTable
CREATE TABLE "public"."RecoverAccountToken" (
    "id" TEXT NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecoverAccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecoverAccountToken_hashedToken_key" ON "public"."RecoverAccountToken"("hashedToken");

-- CreateIndex
CREATE INDEX "RecoverAccountToken_userId_hashedToken_idx" ON "public"."RecoverAccountToken"("userId", "hashedToken");

-- AddForeignKey
ALTER TABLE "public"."RecoverAccountToken" ADD CONSTRAINT "RecoverAccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

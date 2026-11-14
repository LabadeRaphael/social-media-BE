-- CreateTable
CREATE TABLE "public"."ReauthenticationProof" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReauthenticationProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReauthenticationProof_tokenHash_key" ON "public"."ReauthenticationProof"("tokenHash");

-- CreateIndex
CREATE INDEX "ReauthenticationProof_userId_intent_idx" ON "public"."ReauthenticationProof"("userId", "intent");

-- CreateIndex
CREATE INDEX "ReauthenticationProof_expiresAt_idx" ON "public"."ReauthenticationProof"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."ReauthenticationProof" ADD CONSTRAINT "ReauthenticationProof_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

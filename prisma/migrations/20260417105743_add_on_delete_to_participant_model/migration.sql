-- DropForeignKey
ALTER TABLE "public"."Participant" DROP CONSTRAINT "Participant_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

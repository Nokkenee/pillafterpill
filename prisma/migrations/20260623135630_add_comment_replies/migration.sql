-- AlterTable
ALTER TABLE "bug_comments" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "bug_comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

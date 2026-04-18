-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "support_tickets_category_idx" ON "support_tickets"("category");

/*
  Warnings:

  - The `category` column on the `support_tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL_INQUIRY', 'ORDER_ISSUE', 'SUGGESTION', 'PERFORMANCE_CREW', 'EVENT', 'OTHER');

-- AlterTable
ALTER TABLE "support_tickets" DROP COLUMN "category",
ADD COLUMN     "category" "TicketCategory";

-- CreateIndex
CREATE INDEX "support_tickets_category_idx" ON "support_tickets"("category");

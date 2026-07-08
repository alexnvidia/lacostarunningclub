-- AlterTable
ALTER TABLE "subscription_charges" ADD COLUMN     "refunded_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refunded_at" TIMESTAMP(3);

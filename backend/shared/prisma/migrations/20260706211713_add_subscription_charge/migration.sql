-- CreateTable
CREATE TABLE "subscription_charges" (
    "id" TEXT NOT NULL,
    "charge_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_charges_charge_id_key" ON "subscription_charges"("charge_id");

-- CreateIndex
CREATE INDEX "subscription_charges_charge_id_idx" ON "subscription_charges"("charge_id");

-- CreateIndex
CREATE INDEX "subscription_charges_subscription_id_idx" ON "subscription_charges"("subscription_id");

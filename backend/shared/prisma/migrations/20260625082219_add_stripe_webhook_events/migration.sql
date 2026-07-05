-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "subscription_id" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_event_id_key" ON "stripe_webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_event_id_idx" ON "stripe_webhook_events"("event_id");

-- AddForeignKey
ALTER TABLE "stripe_webhook_events" ADD CONSTRAINT "stripe_webhook_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

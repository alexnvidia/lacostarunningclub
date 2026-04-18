-- AlterTable
ALTER TABLE "user_performances" ADD COLUMN     "attachment_url" TEXT,
ADD COLUMN     "avg_heart_rate" INTEGER,
ADD COLUMN     "elevation_gain" INTEGER,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "location" VARCHAR(200),
ADD COLUMN     "max_heart_rate" INTEGER,
ADD COLUMN     "pace" VARCHAR(20),
ADD COLUMN     "race_name" VARCHAR(200),
ADD COLUMN     "surface_type" VARCHAR(20),
ADD COLUMN     "temperature" INTEGER,
ADD COLUMN     "time" VARCHAR(20),
ALTER COLUMN "duration_min" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "user_performances_is_public_idx" ON "user_performances"("is_public");

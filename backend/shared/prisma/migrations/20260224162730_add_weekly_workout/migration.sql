-- CreateTable
CREATE TABLE "weekly_workouts" (
    "id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "workout_type" TEXT,
    "estimated_duration" INTEGER,
    "estimated_distance" DOUBLE PRECISION,
    "difficulty_level" TEXT,
    "warmup" TEXT,
    "main_set" TEXT,
    "cooldown" TEXT,
    "week_start_date" DATE,
    "week_end_date" DATE,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_workouts_year_week_number_idx" ON "weekly_workouts"("year", "week_number");

-- CreateIndex
CREATE INDEX "weekly_workouts_is_published_idx" ON "weekly_workouts"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_workouts_week_number_year_key" ON "weekly_workouts"("week_number", "year");

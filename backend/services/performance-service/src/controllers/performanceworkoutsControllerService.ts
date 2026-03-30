import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { AuthRequest } from '../middlewares/authMiddleware';

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function mapWorkout(w: any) {
  return {
    id: w.id,
    week_number: w.weekNumber,
    year: w.year,
    title: w.title,
    description: w.description,
    workout_type: w.workoutType,
    estimated_duration: w.estimatedDuration,
    estimated_distance: w.estimatedDistance,
    difficulty_level: w.difficultyLevel,
    warmup: w.warmup,
    main_set: w.mainSet,
    cooldown: w.cooldown,
    week_start_date: w.weekStartDate ? w.weekStartDate.toISOString().split('T')[0] : null,
    week_end_date: w.weekEndDate ? w.weekEndDate.toISOString().split('T')[0] : null,
    is_published: w.isPublished,
    published_at: w.publishedAt,
  };
}

/**
 * GET /performance/workouts
 * Returns the published workout for the current week.
 */
export const getCurrentWorkout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const currentWeek = getISOWeekNumber(now);
    const currentYear = now.getFullYear();

    const workout = await prisma.weeklyWorkout.findFirst({
      where: {
        weekNumber: currentWeek,
        year: currentYear,
        isPublished: true,
      },
    });

    if (!workout) {
      res.status(404).json({
        error: `No workout published for week ${currentWeek} of ${currentYear}`,
        code: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json(mapWorkout(workout));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /performance/workouts
 * Creates or updates a weekly workout. ADMIN only.
 */
export const createWorkout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      week_number,
      year,
      title,
      description,
      workout_type,
      estimated_duration,
      estimated_distance,
      difficulty_level,
      warmup,
      main_set,
      cooldown,
      week_start_date,
      week_end_date,
      is_published,
    } = req.body;

    // Validate required fields
    if (!week_number || !year || !title || !description) {
      res.status(400).json({
        error: 'week_number, year, title, and description are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const parsedWeek = Number(week_number);
    if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 53) {
      res.status(400).json({
        error: 'week_number must be an integer between 1 and 53',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < 2025) {
      res.status(400).json({
        error: 'year must be an integer >= 2025',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const validWorkoutTypes = ['technique', 'speed', 'endurance', 'recovery', 'strength', 'mixed'];
    if (workout_type && !validWorkoutTypes.includes(workout_type)) {
      res.status(400).json({
        error: `Invalid workout_type. Allowed values: ${validWorkoutTypes.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (difficulty_level && !validDifficulties.includes(difficulty_level)) {
      res.status(400).json({
        error: `Invalid difficulty_level. Allowed values: ${validDifficulties.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const data = {
      weekNumber: parsedWeek,
      year: parsedYear,
      title: String(title).substring(0, 200),
      description: String(description),
      workoutType: workout_type || null,
      estimatedDuration: estimated_duration !== undefined ? Number(estimated_duration) : null,
      estimatedDistance: estimated_distance !== undefined ? Number(estimated_distance) : null,
      difficultyLevel: difficulty_level || null,
      warmup: warmup || null,
      mainSet: main_set || null,
      cooldown: cooldown || null,
      weekStartDate: week_start_date ? new Date(week_start_date) : null,
      weekEndDate: week_end_date ? new Date(week_end_date) : null,
      isPublished: is_published !== undefined ? Boolean(is_published) : true,
      publishedAt: new Date(),
    };

    // Upsert: creates if not exists, updates if exists for that week/year
    const workout = await prisma.weeklyWorkout.upsert({
      where: { weekNumber_year: { weekNumber: parsedWeek, year: parsedYear } },
      create: data,
      update: data,
    });

    res.status(201).json(mapWorkout(workout));
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: returns a workout by week and year from the DB.
 */
export async function getWorkoutByWeekAndYear(week: number, year: number) {
  return prisma.weeklyWorkout.findUnique({
    where: { weekNumber_year: { weekNumber: week, year } },
  });
}
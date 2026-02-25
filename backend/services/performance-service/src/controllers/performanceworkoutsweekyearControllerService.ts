import { Request, Response, NextFunction } from 'express';
import { getWorkoutByWeekAndYear } from './performanceworkoutsControllerService';

/**
 * GET /performance/workouts/:week/:year
 * Devuelve el entrenamiento de una semana y año específicos desde la BD.
 */
export const getWorkoutByWeek = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const week = Number(req.params.week);
    const year = Number(req.params.year);

    if (!Number.isInteger(week) || week < 1 || week > 53) {
      res.status(400).json({
        error: 'week must be an integer between 1 and 53',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (!Number.isInteger(year) || year < 2025) {
      res.status(400).json({
        error: 'year must be an integer >= 2025',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const rawWorkout = await getWorkoutByWeekAndYear(week, year);

    if (!rawWorkout) {
      res.status(404).json({
        error: `No workout found for week ${week} of ${year}`,
        code: 'NOT_FOUND',
      });
      return;
    }

    const w = rawWorkout;
    res.status(200).json({
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
    });
  } catch (error) {
    next(error);
  }
};
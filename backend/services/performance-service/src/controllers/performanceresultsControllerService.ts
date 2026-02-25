import { Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { AuthRequest } from '../middlewares/authMiddleware';

const VALID_SURFACES = ['road', 'trail', 'track', 'mixed'];

/**
 * POST /performance/results
 * Sube un nuevo resultado de carrera del usuario autenticado.
 * Todos los campos se guardan como columnas reales en UserPerformance.
 */
export const uploadRaceResult = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const {
      race_date,
      race_name,
      distance,
      time,
      pace,
      location,
      surface_type,
      elevation_gain,
      avg_heart_rate,
      max_heart_rate,
      temperature,
      notes,
      attachment_url,
      is_public,
    } = req.body;

    // --- Validate required fields ---
    if (!race_date) {
      res.status(400).json({ error: 'race_date is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const parsedDate = new Date(race_date);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: 'race_date must be a valid date (YYYY-MM-DD)', code: 'VALIDATION_ERROR' });
      return;
    }

    if (distance === undefined || distance === null) {
      res.status(400).json({ error: 'distance is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const parsedDistance = Number(distance);
    if (isNaN(parsedDistance) || parsedDistance <= 0) {
      res.status(400).json({ error: 'distance must be a positive number (km)', code: 'VALIDATION_ERROR' });
      return;
    }

    if (surface_type && !VALID_SURFACES.includes(surface_type)) {
      res.status(400).json({
        error: `Invalid surface_type. Allowed values: ${VALID_SURFACES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    // --- Persist to DB ---
    const performance = await prisma.userPerformance.create({
      data: {
        userId,
        date: parsedDate,
        distanceKm: parsedDistance,
        durationMin: 0,
        raceName: race_name || null,
        time: time || null,
        pace: pace || null,
        location: location || null,
        surfaceType: surface_type || null,
        elevationGain: elevation_gain !== undefined ? Number(elevation_gain) : null,
        avgHeartRate: avg_heart_rate !== undefined ? Number(avg_heart_rate) : null,
        maxHeartRate: max_heart_rate !== undefined ? Number(max_heart_rate) : null,
        temperature: temperature !== undefined ? Number(temperature) : null,
        notes: notes || null,
        attachmentUrl: attachment_url || null,
        isPublic: is_public !== undefined ? Boolean(is_public) : true,
      },
    });

    res.status(201).json(mapPerformance(performance));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /performance/results
 * Devuelve los resultados de carrera del usuario autenticado, con filtros opcionales.
 */
export const getUserResults = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (req.query.from_date) {
      const from = new Date(req.query.from_date as string);
      if (!isNaN(from.getTime())) {
        where.date = { ...where.date, gte: from };
      }
    }

    if (req.query.to_date) {
      const to = new Date(req.query.to_date as string);
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        where.date = { ...where.date, lte: to };
      }
    }

    const [total, performances] = await prisma.$transaction([
      prisma.userPerformance.count({ where }),
      prisma.userPerformance.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json({
      results: performances.map(mapPerformance),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---- Helper ----

function mapPerformance(p: any) {
  return {
    id: p.id,
    user_id: p.userId,
    race_date: p.date.toISOString().split('T')[0],
    race_name: p.raceName,
    distance: p.distanceKm,
    time: p.time,
    pace: p.pace,
    location: p.location,
    surface_type: p.surfaceType,
    elevation_gain: p.elevationGain,
    avg_heart_rate: p.avgHeartRate,
    max_heart_rate: p.maxHeartRate,
    temperature: p.temperature,
    notes: p.notes,
    attachment_url: p.attachmentUrl,
    is_public: p.isPublic,
    created_at: p.createdAt,
  };
}

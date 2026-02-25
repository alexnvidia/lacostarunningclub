import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

/**
 * GET /performance/results/public
 * Devuelve los resultados públicos de todos los usuarios, paginados.
 * Consulta directamente por is_public = true en la BD (sin filtrado en memoria).
 * No requiere autenticación.
 */
export const getPublicResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = { isPublic: true };

    const [total, performances] = await prisma.$transaction([
      prisma.userPerformance.count({ where }),
      prisma.userPerformance.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const results = performances.map((p: any) => ({
      id: p.id,
      user_name: `${p.user.firstName}${p.user.lastName ? ' ' + p.user.lastName : ''}`,
      race_date: p.date.toISOString().split('T')[0],
      race_name: p.raceName,
      distance: p.distanceKm,
      time: p.time,
      pace: p.pace,
      location: p.location,
    }));

    res.status(200).json({
      results,
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
import { Request, Response, NextFunction } from 'express';
import { prisma, Role, OrderStatus } from '@lcrc/shared';

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, active, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role === 'admin' ? Role.ADMIN : Role.USER;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Fetch users with pagination
    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          orders: {
            where: {
              status: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] }
            },
            select: {
              totalAmount: true
            }
          }
        }
      })
    ]);

    // Map to UserSummary schema with aggregated order data
    const mappedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName || '',
      role: user.role,
      active: user.active,
      created_at: user.createdAt,
      total_orders: user.orders.length,
      total_spent: user.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    }));

    res.status(200).json({
      users: mappedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    next(error);
  }
};

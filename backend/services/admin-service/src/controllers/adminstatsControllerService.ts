import { Request, Response, NextFunction } from 'express';
import { prisma, OrderStatus } from '@lcrc/shared';

export const getStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Fetch statistics concurrently
    const [totalUsers, totalOrders, pendingOrders, revenueResult, recentOrders] = await Promise.all([
      // Total users count
      prisma.user.count(),

      // Total orders count
      prisma.order.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Pending orders count
      prisma.order.count({
        where: { status: OrderStatus.PENDING }
      }),

      // Total revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] }
        },
        _sum: {
          totalAmount: true
        }
      }),

      // Recent orders
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          items: true
        }
      })
    ]);

    // Map recent orders to AdminOrderView format
    const mappedRecentOrders = recentOrders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      user_email: order.user?.email || 'N/A',
      user_name: order.user
        ? `${order.user.firstName} ${order.user.lastName || ''}`.trim()
        : 'Unknown User',
      order_date: order.createdAt,
      status: order.status,
      total: Number(order.totalAmount),
      total_items: order.items.reduce((sum: number, item) => sum + item.quantity, 0)
    }));

    const response = {
      total_users: totalUsers,
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      total_revenue: Number(revenueResult._sum.totalAmount || 0),
      recent_orders: mappedRecentOrders
    };

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};
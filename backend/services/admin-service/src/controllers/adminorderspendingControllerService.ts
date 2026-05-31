import { Request, Response, NextFunction } from 'express';
import { prisma, OrderStatus } from '@lcrc/shared';

export const getPendingOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: OrderStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: true
      }
    });

    // Map to AdminOrderView array
    const mappedOrders = orders.map(order => ({
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

    res.status(200).json(mappedOrders);

  } catch (error) {
    next(error);
  }
};

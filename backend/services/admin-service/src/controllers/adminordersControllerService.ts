import { Request, Response, NextFunction } from 'express';
import { prisma, OrderStatus } from '@lcrc/shared';

export const listAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Extract parameters directly from the Query String (req.query)
    // Note: req.query returns strings, so we cast to Number where necessary
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status as string | undefined;

    if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) {
      res.status(400).json({
        error: `Invalid status: ${status}. Allowed values: ${Object.values(OrderStatus).join(', ')}`
      });
      return;
    }
    const userId = req.query.user_id as string | undefined;
    const fromDate = req.query.from_date as string | undefined;
    const toDate = req.query.to_date as string | undefined;

    // 2. Build the 'where' object dynamically
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        if (isNaN(start.getTime())) {
          res.status(400).json({ error: `Invalid from_date format: ${fromDate}` });
          return;
        }
        where.createdAt.gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        if (isNaN(end.getTime())) {
          res.status(400).json({ error: `Invalid to_date format: ${toDate}` });
          return;
        }
        where.createdAt.lte = end;
      }
    }

    // 3. Execute query (Count + FindMany) in transaction
    const [total, orders] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          items: true
        }
      })
    ]);

    // 4. Map response to 'AdminOrderView' schema
    const mappedOrders = orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      user_email: order.user?.email || 'N/A',
      user_name: order.user
        ? `${order.user.firstName} ${order.user.lastName || ''}`.trim()
        : 'Unknown User',
      order_date: order.createdAt,
      status: order.status,
      // Convert Decimal to Number if using Prisma Decimal type
      total: Number(order.totalAmount),
      total_items: order.items.reduce((sum, item) => sum + item.quantity, 0)
    }));

    // 5. Send response
    res.status(200).json({
      orders: mappedOrders,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
};

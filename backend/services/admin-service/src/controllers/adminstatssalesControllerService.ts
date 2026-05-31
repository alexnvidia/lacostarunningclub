import { Request, Response, NextFunction } from 'express';
import { prisma, OrderStatus } from '@lcrc/shared';

export const getSalesStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from_date, to_date } = req.query;

    // Parse date filters
    const where: any = {
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] }
    };

    if (from_date) {
      const fromDate = new Date(from_date as string);
      if (isNaN(fromDate.getTime())) {
        res.status(400).json({
          error: 'Invalid from_date format',
          code: 'INVALID_DATE_FORMAT'
        });
        return;
      }
      if (!where.createdAt) where.createdAt = {};
      where.createdAt.gte = fromDate;
    }

    if (to_date) {
      const toDate = new Date(to_date as string);
      if (isNaN(toDate.getTime())) {
        res.status(400).json({
          error: 'Invalid to_date format',
          code: 'INVALID_DATE_FORMAT'
        });
        return;
      }
      if (!where.createdAt) where.createdAt = {};
      where.createdAt.lte = toDate;
    }


    // Fetch sales data and orders concurrently
    const [salesAggregation, orders] = await Promise.all([
      // Aggregate total sales and count
      prisma.order.aggregate({
        where,
        _sum: {
          totalAmount: true
        },
        _count: true
      }),

      // Get all orders matching criteria with items for top products calculation
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })
    ]);

    // Calculate top products
    const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();

    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = productStats.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total);
        } else {
          productStats.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity,
            revenue: Number(item.total)
          });
        }
      });
    });

    // Convert to array and sort by revenue
    const topProducts = Array.from(productStats.entries())
      .map(([product_id, stats]) => ({
        product_id,
        product_name: stats.name,
        quantity_sold: stats.quantity,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 products

    const totalSales = Number(salesAggregation._sum.totalAmount || 0);
    const totalOrders = salesAggregation._count;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const response = {
      period: `${from_date || 'beginning'} to ${to_date || 'now'}`,
      total_sales: totalSales,
      total_orders: totalOrders,
      average_order_value: Number(averageOrderValue.toFixed(2)),
      top_products: topProducts
    };

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};
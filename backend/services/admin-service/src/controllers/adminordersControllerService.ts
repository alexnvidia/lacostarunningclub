import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

export const listAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Extraer parámetros directamente de la Query String (req.query)
    // Nota: req.query devuelve strings, así que casteamos a Number donde es necesario
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const userId = req.query.user_id as string | undefined;
    const fromDate = req.query.from_date as string | undefined;
    const toDate = req.query.to_date as string | undefined;

    // 2. Construir el objeto 'where' dinámicamente
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.user_id = userId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    // 3. Ejecutar consulta (Count + FindMany) en transacción
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

    // 4. Mapear respuesta al esquema 'AdminOrderView'
    const mappedOrders = orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      user_email: order.user?.email || 'N/A',
      user_name: order.user
        ? `${order.user.firstName} ${order.user.lastName || ''}`.trim()
        : 'Unknown User',
      order_date: order.createdAt,
      status: order.status,
      // Convertir Decimal a Number si usas el tipo Decimal de Prisma
      total: Number(order.totalAmount),
      total_items: order.items.reduce((sum, item) => sum + item.quantity, 0)
    }));

    // 5. Enviar respuesta
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

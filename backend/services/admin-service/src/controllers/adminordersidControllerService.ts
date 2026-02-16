import { Request, Response, NextFunction } from 'express';
import { prisma, OrderStatus } from '@lcrc/shared';

export const getOrderDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        items: {
          include: {
            product: true
          }
        },
        shippingAddress: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' }
        }
      }
    });

    if (!order) {
      res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
      return;
    }

    // Map to AdminOrderDetail schema
    const response = {
      id: order.id,
      order_number: order.orderNumber,
      user: {
        id: order.user.id,
        email: order.user.email,
        first_name: order.user.firstName,
        last_name: order.user.lastName || ''
      },
      order_date: order.createdAt,
      status: order.status,
      subtotal: Number(order.subtotalAmount),
      shipping_cost: Number(order.shippingCost),
      total: Number(order.totalAmount),
      shipping_address: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postal_code: order.shippingAddress.postalCode,
        country: order.shippingAddress.country
      },
      tracking_number: order.trackingNumber,
      customer_notes: null, // Not in schema
      admin_notes: null, // Not in schema
      items: order.items.map(item => ({
        product_id: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        total: Number(item.total)
      })),
      status_history: order.statusHistory.map(history => ({
        previous_status: history.previousStatus,
        new_status: history.newStatus,
        changed_at: history.changedAt,
        comment: history.comment
      }))
    };

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, admin_notes } = req.body;

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      res.status(404).json({
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (tracking_number !== undefined) updateData.trackingNumber = tracking_number;
    if (status !== undefined) {
      // Convert lowercase to uppercase enum
      const normalizedStatus = status.toUpperCase();
      if (!Object.values(OrderStatus).includes(normalizedStatus as any)) {
        res.status(400).json({
          error: 'Invalid order status',
          code: 'INVALID_ORDER_STATUS',
          validStatuses: Object.values(OrderStatus)
        });
        return;
      }
      updateData.status = normalizedStatus;
    }

    // Use transaction to update order and create status history
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update the order
      const order = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          items: {
            include: {
              product: true
            }
          },
          shippingAddress: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' }
          }
        }
      });

      // If status changed, create history record
      if (status && status.toUpperCase() !== existingOrder.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            previousStatus: existingOrder.status,
            newStatus: status.toUpperCase(),
            comment: admin_notes || `Status updated to ${status}`
          }
        });
      }

      return order;
    });

    // Map to AdminOrderDetail schema
    const response = {
      id: updatedOrder.id,
      order_number: updatedOrder.orderNumber,
      user: {
        id: updatedOrder.user.id,
        email: updatedOrder.user.email,
        first_name: updatedOrder.user.firstName,
        last_name: updatedOrder.user.lastName || ''
      },
      order_date: updatedOrder.createdAt,
      status: updatedOrder.status,
      subtotal: Number(updatedOrder.subtotalAmount),
      shipping_cost: Number(updatedOrder.shippingCost),
      total: Number(updatedOrder.totalAmount),
      shipping_address: {
        street: updatedOrder.shippingAddress.street,
        city: updatedOrder.shippingAddress.city,
        state: updatedOrder.shippingAddress.state,
        postal_code: updatedOrder.shippingAddress.postalCode,
        country: updatedOrder.shippingAddress.country
      },
      tracking_number: updatedOrder.trackingNumber,
      customer_notes: null,
      admin_notes: admin_notes || null,
      items: updatedOrder.items.map(item => ({
        product_id: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        total: Number(item.total)
      })),
      status_history: updatedOrder.statusHistory.map(history => ({
        previous_status: history.previousStatus,
        new_status: history.newStatus,
        changed_at: history.changedAt,
        comment: history.comment
      }))
    };

    res.status(200).json(response);

  } catch (error) {
    next(error);
  }
};

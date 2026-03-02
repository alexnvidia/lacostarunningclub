import { Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { TicketStatus } from '@lcrc/shared';
import { AuthRequest } from '../middlewares/authMiddleware';
import { notificationQueue } from '../queue/notificationQueue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const STATUS_MAP: Record<string, TicketStatus> = {
  open: 'OPEN',
  in_progress: 'IN_PROGRESS',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
};

const STATUS_REVERSE: Record<string, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const PRIORITY_REVERSE: Record<string, string> = {
  LOW: 'low',
  MEDIUM: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

const CATEGORY_REVERSE: Record<string, string> = {
  GENERAL_INQUIRY: 'general_inquiry',
  ORDER_ISSUE: 'order_issue',
  SUGGESTION: 'suggestion',
  PERFORMANCE_CREW: 'performance_crew',
  EVENT: 'event',
  OTHER: 'other',
};

export const getMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({ error: 'Invalid message ID format. Must be a valid UUID', code: 'BAD_REQUEST' });
      return;
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Message not found', code: 'NOT_FOUND' });
      return;
    }

    // Only owner or admin/support can view the message
    const isStaff = req.user.role === 'ADMIN' || req.user.role === 'SUPPORT';
    if (ticket.userId !== req.user.id && !isStaff) {
      res.status(403).json({ error: 'Forbidden - you can only view your own messages', code: 'FORBIDDEN' });
      return;
    }

    // Auto-mark unread staff replies as read when the ticket owner opens the ticket
    if (!isStaff && ticket.userId === req.user.id) {
      await prisma.message.updateMany({
        where: {
          ticketId: ticket.id,
          senderId: { not: ticket.userId }, // only staff replies
          readAt: null,                      // only unread ones
        },
        data: { readAt: new Date() },
      });
    }

    const replies = ticket.messages.map((m) => ({
      id: m.id,
      message_id: m.ticketId,
      author_user_id: m.senderId,
      reply: m.content,
      is_admin: m.senderId !== ticket.userId,
      read_at: m.readAt ?? null,
      created_at: m.createdAt,
    }));

    res.status(200).json({
      id: ticket.id,
      user_id: ticket.userId,
      subject: ticket.subject,
      message: replies[0]?.reply ?? '',
      category: ticket.category ? CATEGORY_REVERSE[ticket.category] : null,
      priority: PRIORITY_REVERSE[ticket.priority] ?? 'normal',
      status: STATUS_REVERSE[ticket.status] ?? 'open',
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      replies,
    });

  } catch (error) {
    next(error);
  }
};

export const updateMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({ error: 'Invalid message ID format. Must be a valid UUID', code: 'BAD_REQUEST' });
      return;
    }

    if (!req.body || Object.keys(req.body as object).length === 0) {
      res.status(400).json({ error: 'Request body must contain at least one field to update', code: 'VALIDATION_ERROR' });
      return;
    }

    const { status, assigned_to_user_id } = req.body as {
      status?: unknown;
      assigned_to_user_id?: unknown;
    };

    if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
      res.status(400).json({
        error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (assigned_to_user_id !== undefined) {
      if (typeof assigned_to_user_id !== 'string' || !UUID_REGEX.test(assigned_to_user_id)) {
        res.status(400).json({ error: 'assigned_to_user_id must be a valid UUID', code: 'VALIDATION_ERROR' });
        return;
      }
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      res.status(404).json({ error: 'Message not found', code: 'NOT_FOUND' });
      return;
    }

    // Verify assigned user exists before updating
    if (assigned_to_user_id !== undefined) {
      const assignedUser = await prisma.user.findUnique({ where: { id: assigned_to_user_id as string } });
      if (!assignedUser) {
        res.status(404).json({ error: 'Assigned user not found', code: 'NOT_FOUND' });
        return;
      }
    }

    // Build update payload explicitly typed
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status: STATUS_MAP[status as string] } : {}),
        ...(assigned_to_user_id !== undefined ? { assignedTo: assigned_to_user_id as string } : {}),
      },
    });

    // Notify ticket owner about the status change
    if (status !== undefined) {
      await notificationQueue.add({
        userId: ticket.userId,
        title: 'Estado de tu mensaje actualizado',
        message: `El estado de tu mensaje "${ticket.subject}" ha cambiado a: ${status as string}.`,
        type: 'SUPPORT',
      });
    }

    res.status(200).json({
      id: updated.id,
      user_id: updated.userId,
      subject: updated.subject,
      category: updated.category ? CATEGORY_REVERSE[updated.category] : null,
      priority: PRIORITY_REVERSE[updated.priority] ?? 'normal',
      status: STATUS_REVERSE[updated.status] ?? 'open',
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    });

  } catch (error) {
    next(error);
  }
};
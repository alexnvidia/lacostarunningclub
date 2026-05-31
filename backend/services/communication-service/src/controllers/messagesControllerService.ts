import { Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { TicketStatus, Priority, TicketCategory } from '@lcrc/shared';
import { AuthRequest } from '../middlewares/authMiddleware';
import { notificationQueue } from '../queue/notificationQueue';

const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// Map OpenAPI values → Prisma enums
const CATEGORY_MAP: Record<string, TicketCategory> = {
  general_inquiry: 'GENERAL_INQUIRY',
  order_issue: 'ORDER_ISSUE',
  suggestion: 'SUGGESTION',
  performance_crew: 'PERFORMANCE_CREW',
  event: 'EVENT',
  other: 'OTHER',
};

// Map Prisma enums → OpenAPI values
const CATEGORY_REVERSE: Record<string, string> = {
  GENERAL_INQUIRY: 'general_inquiry',
  ORDER_ISSUE: 'order_issue',
  SUGGESTION: 'suggestion',
  PERFORMANCE_CREW: 'performance_crew',
  EVENT: 'event',
  OTHER: 'other',
};

// Map OpenAPI values → Prisma enums
const STATUS_MAP: Record<string, TicketStatus> = {
  open: 'OPEN',
  in_progress: 'IN_PROGRESS',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
};

const PRIORITY_MAP: Record<string, Priority> = {
  low: 'LOW',
  normal: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
};

// Map Prisma enums → OpenAPI values
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

export const createMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const { subject, message, category, priority } = req.body as {
      subject?: unknown;
      message?: unknown;
      category?: unknown;
      priority?: unknown;
    };

    // Validate required fields
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      res.status(400).json({ error: 'subject is required and must be a non-empty string', code: 'VALIDATION_ERROR' });
      return;
    }

    if (subject.trim().length > 200) {
      res.status(400).json({ error: 'subject must not exceed 200 characters', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'message is required and must be a non-empty string', code: 'VALIDATION_ERROR' });
      return;
    }

    if (category !== undefined && !Object.keys(CATEGORY_MAP).includes(category as string)) {
      res.status(400).json({
        error: `Invalid category. Allowed: ${Object.keys(CATEGORY_MAP).join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (priority !== undefined && !VALID_PRIORITIES.includes(priority as string)) {
      res.status(400).json({
        error: `Invalid priority. Allowed: ${VALID_PRIORITIES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const prismaPriority: Priority = priority ? PRIORITY_MAP[priority as string] : 'MEDIUM';

    // Create ticket + first message in a transaction
    const ticket = await prisma.$transaction(async (tx) => {
      const newTicket = await tx.supportTicket.create({
        data: {
          userId: req.user!.id,
          subject: subject.trim(),
          category: category ? CATEGORY_MAP[category as string] : null,
          status: 'OPEN',
          priority: prismaPriority,
        },
      });

      await tx.message.create({
        data: {
          ticketId: newTicket.id,
          senderId: req.user!.id,
          content: (message as string).trim(),
          isInternal: false,
        },
      });

      return newTicket;
    });

    // Enqueue async notification for the user
    await notificationQueue.add({
      userId: req.user.id,
      title: 'Mensaje enviado',
      message: `Tu mensaje "${subject.trim()}" ha sido recibido. Te responderemos lo antes posible.`,
      type: 'SUPPORT',
    });

    res.status(201).json({
      id: ticket.id,
      user_id: ticket.userId,
      subject: ticket.subject,
      message: (message as string).trim(),
      category: ticket.category ? CATEGORY_REVERSE[ticket.category] : null,
      priority: PRIORITY_REVERSE[ticket.priority] ?? 'normal',
      status: STATUS_REVERSE[ticket.status] ?? 'open',
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
    });

  } catch (error) {
    next(error);
  }
};

export const listMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const statusParam = req.query.status as string | undefined;
    const assignedToParam = req.query.assigned_to as string | undefined;

    // Validate status filter
    if (statusParam !== undefined && !VALID_STATUSES.includes(statusParam)) {
      res.status(400).json({
        error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const isStaff = req.user.role === 'ADMIN' || req.user.role === 'SUPPORT';

    // Build where clause: staff see all tickets, regular users only their own
    const where: {
      userId?: string;
      status?: TicketStatus;
      assignedTo?: string | null;
    } = isStaff ? {} : { userId: req.user.id };

    if (statusParam) {
      where.status = STATUS_MAP[statusParam];
    }

    // Staff-only assignment filter
    if (isStaff && assignedToParam) {
      if (assignedToParam === 'me') {
        where.assignedTo = req.user.id;
      } else if (assignedToParam === 'unassigned') {
        where.assignedTo = null;
      }
    }

    const [total, tickets] = await prisma.$transaction([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    const messages = tickets.map((ticket) => {
      // Count staff replies the ticket owner has NOT yet read
      const unreadReplies = ticket.messages.filter(
        (m) => m.senderId !== ticket.userId && m.readAt === null
      ).length;

      return {
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category ? CATEGORY_REVERSE[ticket.category] : null,
        status: STATUS_REVERSE[ticket.status] ?? 'open',
        priority: PRIORITY_REVERSE[ticket.priority] ?? 'normal',
        created_at: ticket.createdAt,
        unread_replies: unreadReplies,
        ...(isStaff ? { assigned_to_user_id: ticket.assignedTo ?? null } : {}),
      };
    });

    res.status(200).json({
      messages,
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

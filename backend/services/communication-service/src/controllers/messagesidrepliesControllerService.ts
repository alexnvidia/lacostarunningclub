import { Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { AuthRequest } from '../middlewares/authMiddleware';
import { notificationQueue } from '../queue/notificationQueue';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const replyToMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

    const { reply, attachment_url } = req.body as {
      reply?: unknown;
      attachment_url?: unknown;
    };

    if (!reply || typeof reply !== 'string' || reply.trim() === '') {
      res.status(400).json({ error: 'reply is required and must be a non-empty string', code: 'VALIDATION_ERROR' });
      return;
    }

    if (attachment_url !== undefined && typeof attachment_url !== 'string') {
      res.status(400).json({ error: 'attachment_url must be a string', code: 'VALIDATION_ERROR' });
      return;
    }

    // Load ticket
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });

    if (!ticket) {
      res.status(404).json({ error: 'Message not found', code: 'NOT_FOUND' });
      return;
    }

    // Access control: owner or admin/support can reply
    const isStaff = req.user.role === 'ADMIN' || req.user.role === 'SUPPORT';
    if (ticket.userId !== req.user.id && !isStaff) {
      res.status(403).json({ error: 'Forbidden - you can only reply to your own messages', code: 'FORBIDDEN' });
      return;
    }

    // Cannot reply to closed tickets
    if (ticket.status === 'CLOSED') {
      res.status(400).json({ error: 'Cannot reply to a closed message', code: 'INVALID_STATUS' });
      return;
    }

    const replyMsg = await prisma.message.create({
      data: {
        ticketId: id,
        senderId: req.user.id,
        content: (reply as string).trim(),
        isInternal: isStaff,
      },
    });

    // If staff replied → move ticket to IN_PROGRESS if it was OPEN
    if (isStaff && ticket.status === 'OPEN') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Async notification
    if (isStaff) {
      // Notify ticket owner about the staff reply
      await notificationQueue.add({
        userId: ticket.userId,
        title: 'Tienes una nueva respuesta',
        message: `Has recibido una respuesta en tu mensaje "${ticket.subject}".`,
        type: 'SUPPORT',
      });
    }

    res.status(201).json({
      id: replyMsg.id,
      message_id: replyMsg.ticketId,
      author_user_id: replyMsg.senderId,
      reply: replyMsg.content,
      is_admin: isStaff,
      created_at: replyMsg.createdAt,
    });

  } catch (error) {
    next(error);
  }
};
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Express } from 'express';
import { emailQueue, notificationQueue } from '../queues/monitoredQueues';

export const setupBullBoard = (app: Express, path: string) => {
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(path);

    createBullBoard({
      queues: [
        new BullAdapter(emailQueue),
        new BullAdapter(notificationQueue),
      ],
      serverAdapter: serverAdapter,
    });

    // Montar el router
    app.use(path, serverAdapter.getRouter());

    console.log(`📊 Bull Board initialized at ${path}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Bull Board:', error);
    return false;
  }
};

// The bounded-concurrency in-process recommendation dispatcher (TechArch §5).
//
// There is NO scheduler, cron, or queue library here (PRD §10 excludes bullmq /
// bull / agenda / node-cron, enforced by absence.spec.ts). The whole mechanism
// is an in-memory FIFO queue plus a semaphore: `dispatch` enqueues an exception
// id and returns SYNCHRONOUSLY (it never returns a promise), and a pump drains
// the queue up to `concurrency` jobs at a time. Excess dispatches queue in
// process rather than spawning unbounded work (T-05-10).
//
// `dispatch`'s synchronous void signature matches receipt.service.ts's existing
// `dispatchRecommendation?: (exceptionId: string) => void` seam EXACTLY, so this
// worker drops into that seam at boot (server/src/index.ts) with no change to
// receipt.service.ts.

import { logger } from '../http/logger.js';

export interface RecommendationWorker {
  dispatch(exceptionId: string): void;
}

export function createRecommendationWorker(deps: {
  concurrency: number;
  runJob: (exceptionId: string) => Promise<void>;
}): RecommendationWorker {
  const queue: string[] = [];
  let active = 0;

  function pump(): void {
    while (active < deps.concurrency && queue.length > 0) {
      const id = queue.shift() as string;
      active += 1;
      void deps
        .runJob(id)
        .catch((err) => {
          // runJob already catches internally; this is belt-and-braces so a
          // programming error there can never take down the process.
          logger.error(
            { exception_id: id, err },
            'recommendation worker: unexpected job rejection',
          );
        })
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  }

  return {
    dispatch(exceptionId: string): void {
      queue.push(exceptionId);
      pump();
    },
  };
}

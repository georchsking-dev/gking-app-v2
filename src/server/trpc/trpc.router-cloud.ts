import * as z from 'zod/v4';
import { createTRPCRouter, publicProcedure } from './trpc.server';
import { backendRouter } from '~/modules/backend/backend.router';
import { browseRouter } from '~/modules/browse/browse.router';

const tradeRouter = createTRPCRouter({
  storageGet: publicProcedure
    .input(z.object({ objectId: z.string().nullable() }))
    .query(async () => {
      return { type: 'error' as const, error: 'Database storage not configured' };
    }),
  storageDelete: publicProcedure
    .input(z.object({ objectId: z.string(), deletionKey: z.string() }))
    .mutation(async () => {
      return { type: 'error' as const, error: 'Database storage not configured' };
    }),
});

export const appRouterCloud = createTRPCRouter({
  backend: backendRouter,
  browse: browseRouter,
  trade: tradeRouter,
});

export type AppRouterCloud = typeof appRouterCloud;

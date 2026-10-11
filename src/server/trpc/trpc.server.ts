import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

export interface TRPCContext {
  req?: Request;
}

export const createTRPCFetchContext = async (opts: { req: Request }): Promise<TRPCContext> => {
  return {
    req: opts.req,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const edgeProcedure = t.procedure;
export const authedProcedure = t.procedure;

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { telemetryRouter } from "./routers/telemetry";
import { logsRouter } from "./routers/logs";
import { sourcesRouter } from "./routers/sources";
import { stressTestRouter } from "./routers/stressTest";

export const appRouter = router({
  // System and auth routes
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers for telemetry platform
  telemetry: telemetryRouter,
  logs: logsRouter,
  sources: sourcesRouter,
  stressTest: stressTestRouter,
});

export type AppRouter = typeof appRouter;

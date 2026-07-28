/**
 * Sources Router
 * Handles data source management and statistics
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getSources,
  getSourceStats,
} from "../db";

/**
 * Sources router
 */
export const sourcesRouter = router({
  /**
   * Get all data sources
   * Returns a list of all unique sources that have sent telemetry or logs
   */
  getSources: publicProcedure
    .query(async () => {
      try {
        const sources = await getSources();
        return {
          success: true,
          sources,
          count: sources.length,
        };
      } catch (error) {
        console.error("[Sources] Get sources error:", error);
        throw new Error("Failed to retrieve data sources");
      }
    }),

  getStats: publicProcedure
    .input(z.object({ sourceName: z.string() }))
    .query(async ({ input }) => {
      try {
        const allStats = await getSourceStats();
        const stats = allStats.find(s => s.source === input.sourceName) || null;
        
        return {
          success: true,
          stats,
        };
      } catch (error) {
        console.error("[Sources] Get stats error:", error);
        throw new Error("Failed to retrieve source statistics");
      }
    }),
});

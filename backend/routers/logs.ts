/**
 * Logs Router
 * Handles all log entry ingestion and querying procedures
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  ingestLogEntry,
  getLogs,
  getLogStats,
} from "../db";
import type { IngestLogInput, LogFilterOptions } from "../../shared/types";

/**
 * Log level enumeration
 */
const logLevelEnum = z.enum(["DEBUG", "INFO", "WARN", "ERROR"]);

/**
 * Input validation schemas
 */
const ingestLogSchema = z.object({
  level: logLevelEnum,
  message: z.string().min(1, "Log message is required"),
  source: z.string().min(1, "Log source is required"),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.date().optional(),
})

const getLogsSchema = z.object({
  level: z.array(logLevelEnum).optional(),
  source: z.array(z.string()).optional(),
  search: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

const getLogStatsSchema = z.object({
  timeWindowMinutes: z.number().default(60),
});

/**
 * Logs router
 */
export const logsRouter = router({
  /**
   * Ingest a single log entry
   * Accepts structured log data and persists it to the database
   */
  ingest: publicProcedure
    .input(ingestLogSchema)
    .mutation(async ({ input }) => {
      try {
        const logEntry = await ingestLogEntry(input as IngestLogInput);
        return {
          success: true,
          logEntry,
        };
      } catch (error) {
        console.error("[Logs] Ingestion error:", error);
        throw new Error("Failed to ingest log entry");
      }
    }),

  /**
   * Ingest multiple log entries in batch
   * Useful for bulk log ingestion
   */
  ingestBatch: publicProcedure
    .input(z.array(ingestLogSchema))
    .mutation(async ({ input }) => {
      try {
        const results = await Promise.all(
          input.map((item) => ingestLogEntry(item as IngestLogInput))
        );
        return {
          success: true,
          count: results.length,
          logEntries: results,
        };
      } catch (error) {
        console.error("[Logs] Batch ingestion error:", error);
        throw new Error("Failed to ingest log batch");
      }
    }),

  /**
   * Get paginated logs with filtering and search
   * Supports filtering by level, source, time range, and full-text search
   */
  getLogs: publicProcedure
    .input(getLogsSchema)
    .query(async ({ input }) => {
      try {
        const filters: LogFilterOptions = {
          level: input.level,
          source: input.source,
          search: input.search,
          startTime: input.startTime,
          endTime: input.endTime,
          page: input.page,
          pageSize: input.pageSize,
        };

        const result = await getLogs(filters);
        return {
          success: true,
          ...result,
        };
      } catch (error) {
        console.error("[Logs] Get logs error:", error);
        throw new Error("Failed to retrieve logs");
      }
    }),

  /**
   * Get aggregated log statistics
   * Returns total logs, error count, warning count, and error rate
   */
  getStats: publicProcedure
    .input(getLogStatsSchema)
    .query(async ({ input }) => {
      try {
        const stats = await getLogStats(input.timeWindowMinutes);
        return {
          success: true,
          stats: {
            ...stats,
            lastUpdate: new Date(),
          },
        };
      } catch (error) {
        console.error("[Logs] Get stats error:", error);
        throw new Error("Failed to retrieve log statistics");
      }
    }),
});

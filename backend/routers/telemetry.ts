/**
 * Telemetry Router
 * Handles all telemetry event ingestion and querying procedures
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  ingestTelemetryEvent,
  getTelemetryEvents,
  getTelemetryStats,
  getTelemetryTimeSeries,
} from "../db";
import type { IngestTelemetryInput } from "../../shared/types";

/**
 * Input validation schemas
 */
const ingestTelemetrySchema = z.object({
  name: z.string().min(1, "Metric name is required"),
  value: z.number(),
  tags: z.record(z.string(), z.string()).optional(),
  source: z.string().min(1, "Source is required"),
  timestamp: z.date().optional(),
})

const getEventsSchema = z.object({
  source: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  limit: z.number().optional(),
});

const getTimeSeriesSchema = z.object({
  timeWindowMinutes: z.number().default(60),
  bucketSizeSeconds: z.number().default(60),
});

/**
 * Telemetry router
 */
export const telemetryRouter = router({
  /**
   * Ingest a single telemetry event
   * Accepts metric data and persists it to the database
   */
  ingest: publicProcedure
    .input(ingestTelemetrySchema)
    .mutation(async ({ input }) => {
      try {
        const event = await ingestTelemetryEvent(input as IngestTelemetryInput);
        return {
          success: true,
          event,
        };
      } catch (error) {
        console.error("[Telemetry] Ingestion error:", error);
        throw new Error("Failed to ingest telemetry event");
      }
    }),

  /**
   * Ingest multiple telemetry events in batch
   * Useful for bulk data ingestion
   */
  ingestBatch: publicProcedure
    .input(z.array(ingestTelemetrySchema))
    .mutation(async ({ input }) => {
      try {
        const results = await Promise.all(
          input.map((item) => ingestTelemetryEvent(item as IngestTelemetryInput))
        );
        return {
          success: true,
          count: results.length,
          events: results,
        };
      } catch (error) {
        console.error("[Telemetry] Batch ingestion error:", error);
        throw new Error("Failed to ingest telemetry batch");
      }
    }),

  /**
   * Get telemetry events with optional filtering
   * Returns events matching the specified criteria
   */
  getEvents: publicProcedure
    .input(getEventsSchema)
    .query(async ({ input }) => {
      try {
        const events = await getTelemetryEvents(input);
        return {
          success: true,
          events,
          count: events.length,
        };
      } catch (error) {
        console.error("[Telemetry] Get events error:", error);
        throw new Error("Failed to retrieve telemetry events");
      }
    }),

  /**
   * Get aggregated telemetry statistics
   * Returns total events, events per minute, and active sources
   */
  getStats: publicProcedure
    .input(z.object({ timeWindowMinutes: z.number().default(60) }))
    .query(async ({ input }) => {
      try {
        const stats = await getTelemetryStats(input.timeWindowMinutes);
        return {
          success: true,
          stats: {
            ...stats,
            lastUpdate: new Date(),
          },
        };
      } catch (error) {
        console.error("[Telemetry] Get stats error:", error);
        throw new Error("Failed to retrieve telemetry statistics");
      }
    }),

  /**
   * Get time-series data for charting
   * Returns aggregated metrics over a rolling window
   */
  getTimeSeries: publicProcedure
    .input(getTimeSeriesSchema)
    .query(async ({ input }) => {
      try {
        const timeSeries = await getTelemetryTimeSeries(
          input.timeWindowMinutes,
          input.bucketSizeSeconds
        );
        return {
          success: true,
          timeSeries,
          count: timeSeries.length,
        };
      } catch (error) {
        console.error("[Telemetry] Get time-series error:", error);
        throw new Error("Failed to retrieve time-series data");
      }
    }),
});

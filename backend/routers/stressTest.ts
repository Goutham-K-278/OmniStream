/**
 * Stress Test Router
 * Handles synthetic telemetry and log data generation for testing
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  ingestTelemetryEvent,
  ingestLogEntry,
} from "../db";
import type { IngestTelemetryInput, IngestLogInput } from "../../shared/types";

/**
 * Input validation schemas
 */
const stressTestConfigSchema = z.object({
  eventCount: z.number().min(1).max(10000),
  logCount: z.number().min(1).max(10000),
  duration: z.number().min(100).max(60000),
  burstSize: z.number().min(1).max(1000),
});

/**
 * Stress test router
 */
export const stressTestRouter = router({
  /**
   * Generate synthetic telemetry and log data
   * Creates a burst of test data to validate the ingestion pipeline
   */
  generateData: publicProcedure
    .input(stressTestConfigSchema)
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      let eventsGenerated = 0;
      let logsGenerated = 0;
      let errors = 0;

      try {
        // Generate synthetic telemetry events
        const telemetryPromises: Promise<any>[] = [];
        for (let i = 0; i < input.eventCount; i++) {
          const telemetryInput: IngestTelemetryInput = {
            name: getRandomMetricName(),
            value: Math.random() * 100,
            tags: {
              environment: getRandomEnvironment(),
              region: getRandomRegion(),
              service: getRandomService(),
            },
            source: getRandomSource(),
            timestamp: new Date(Date.now() - Math.random() * 60000),
          };

          telemetryPromises.push(
            ingestTelemetryEvent(telemetryInput)
              .then(() => {
                eventsGenerated++;
              })
              .catch((err) => {
                console.error("[StressTest] Telemetry ingestion error:", err);
                errors++;
              })
          );

          // Respect burst size
          if ((i + 1) % input.burstSize === 0) {
            await Promise.all(telemetryPromises);
            telemetryPromises.length = 0;
          }
        }

        // Wait for remaining telemetry promises
        if (telemetryPromises.length > 0) {
          await Promise.all(telemetryPromises);
        }

        // Generate synthetic log entries
        const logPromises: Promise<any>[] = [];
        for (let i = 0; i < input.logCount; i++) {
          const logInput: IngestLogInput = {
            level: getRandomLogLevel(),
            message: getRandomLogMessage(),
            source: getRandomSource(),
            metadata: {
              userId: Math.floor(Math.random() * 10000),
              requestId: generateRequestId(),
              duration: Math.floor(Math.random() * 5000),
            },
            timestamp: new Date(Date.now() - Math.random() * 60000),
          };

          logPromises.push(
            ingestLogEntry(logInput)
              .then(() => {
                logsGenerated++;
              })
              .catch((err) => {
                console.error("[StressTest] Log ingestion error:", err);
                errors++;
              })
          );

          // Respect burst size
          if ((i + 1) % input.burstSize === 0) {
            await Promise.all(logPromises);
            logPromises.length = 0;
          }
        }

        // Wait for remaining log promises
        if (logPromises.length > 0) {
          await Promise.all(logPromises);
        }

        const duration = Date.now() - startTime;

        return {
          success: true,
          eventsGenerated,
          logsGenerated,
          errors,
          duration,
          message: `Generated ${eventsGenerated} events and ${logsGenerated} logs in ${duration}ms`,
        };
      } catch (error) {
        console.error("[StressTest] Generation error:", error);
        throw new Error("Failed to generate synthetic data");
      }
    }),

  /**
   * Get stress test configuration schema
   * Returns the expected input format for stress testing
   */
  getConfig: publicProcedure
    .query(() => {
      return {
        success: true,
        config: {
          eventCount: { min: 1, max: 10000, description: "Number of telemetry events to generate" },
          logCount: { min: 1, max: 10000, description: "Number of log entries to generate" },
          duration: { min: 100, max: 60000, description: "Duration in milliseconds" },
          burstSize: { min: 1, max: 1000, description: "Number of events per burst" },
        },
      };
    }),
});

/**
 * Helper functions for synthetic data generation
 */

function getRandomMetricName(): string {
  const metrics = [
    "cpu_usage",
    "memory_usage",
    "disk_io",
    "network_latency",
    "request_duration",
    "error_rate",
    "throughput",
    "cache_hit_rate",
  ];
  return metrics[Math.floor(Math.random() * metrics.length)];
}

function getRandomLogLevel(): "DEBUG" | "INFO" | "WARN" | "ERROR" {
  const levels = ["DEBUG", "INFO", "WARN", "ERROR"] as const;
  const weights = [0.1, 0.6, 0.2, 0.1]; // Weighted distribution
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return levels[i];
    }
  }
  return "INFO";
}

function getRandomLogMessage(): string {
  const messages = [
    "Request processed successfully",
    "Database query executed",
    "Cache miss detected",
    "User authentication failed",
    "Service health check passed",
    "Memory threshold exceeded",
    "API rate limit approached",
    "Background job completed",
    "Configuration reloaded",
    "Connection timeout occurred",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomEnvironment(): string {
  const envs = ["production", "staging", "development"];
  return envs[Math.floor(Math.random() * envs.length)];
}

function getRandomRegion(): string {
  const regions = ["us-east", "us-west", "eu-central", "ap-southeast"];
  return regions[Math.floor(Math.random() * regions.length)];
}

function getRandomService(): string {
  const services = ["api", "worker", "scheduler", "cache", "database"];
  return services[Math.floor(Math.random() * services.length)];
}

function getRandomSource(): string {
  const sources = ["server-01", "server-02", "server-03", "worker-01", "worker-02"];
  return sources[Math.floor(Math.random() * sources.length)];
}

function generateRequestId(): string {
  return `req-${Math.random().toString(36).substr(2, 9)}`;
}

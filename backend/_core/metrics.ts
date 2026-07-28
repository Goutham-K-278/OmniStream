/**
 * Prometheus Metrics Exporter
 *
 * This module creates a /metrics HTTP endpoint that Prometheus scrapes
 * every 15 seconds. It tracks OmniStream-specific application metrics
 * so they appear in Grafana dashboards.
 */

import client from "prom-client";

// 1. Create a Prometheus Registry to hold all our custom metrics
const register = new client.Registry();

// 2. Automatically collect default Node.js metrics (CPU, memory, event loop lag)
client.collectDefaultMetrics({ register });

// ------------------------------------------------------------------
// Custom OmniStream Metrics
// ------------------------------------------------------------------

/** Counts every telemetry event ingested (incremented by stressTest & ingest routes) */
export const telemetryEventsTotal = new client.Counter({
  name: "omnistream_telemetry_events_total",
  help: "Total number of telemetry events ingested",
  labelNames: ["source", "metric_name"],
  registers: [register],
});

/** Counts every log entry ingested */
export const logEntriesTotal = new client.Counter({
  name: "omnistream_log_entries_total",
  help: "Total number of log entries ingested",
  labelNames: ["source", "level"],
  registers: [register],
});

/** Tracks the current error rate as a gauge (can go up and down) */
export const errorRateGauge = new client.Gauge({
  name: "omnistream_error_rate",
  help: "Current error rate percentage from log entries",
  registers: [register],
});

/** Tracks active data sources count */
export const activeSourcesGauge = new client.Gauge({
  name: "omnistream_active_sources",
  help: "Number of active data sources sending data",
  registers: [register],
});

/** Measures how long HTTP requests take (creates histogram buckets for Grafana) */
export const httpRequestDuration = new client.Histogram({
  name: "omnistream_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

/** Exports the registry so the Express route can call register.metrics() */
export default register;

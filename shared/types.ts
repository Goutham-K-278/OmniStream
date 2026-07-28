/**
 * Shared type definitions for OmniStream telemetry platform
 * These types are used across server routers and client components
 */

/**
 * Log level enumeration
 * Used to categorize log entries by severity
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Telemetry event data point
 * Represents a single metric measurement
 */
export interface TelemetryEvent {
  id: number;
  name: string;
  value: number;
  tags: Record<string, string>;
  source: string;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Telemetry event input for ingestion
 * Client sends this to the ingestTelemetry procedure
 */
export interface IngestTelemetryInput {
  name: string;
  value: number;
  tags?: Record<string, string>;
  source: string;
  timestamp?: Date;
}

/**
 * Log entry data
 * Represents a structured log message
 */
export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Log entry input for ingestion
 * Client sends this to the ingestLog procedure
 */
export interface IngestLogInput {
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Data source information
 * Represents a unique source sending telemetry/logs
 */
export interface DataSource {
  id: number;
  name: string;
  lastSeen: Date;
  eventCount: number;
  logCount: number;
}

/**
 * Telemetry statistics
 * Aggregated metrics for dashboard display
 */
export interface TelemetryStats {
  totalEvents: number;
  eventsPerMinute: number;
  errorRate: number;
  activeSources: number;
  lastUpdate: Date;
}

/**
 * Time-series data point for charts
 * Represents aggregated metrics at a specific time
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  eventCount: number;
  errorCount: number;
  throughput: number;
}

/**
 * Paginated response wrapper
 * Used for list endpoints with pagination
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Log filter options
 * Used for filtering logs in the explorer
 */
export interface LogFilterOptions {
  level?: LogLevel[];
  source?: string[];
  search?: string;
  startTime?: Date;
  endTime?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * Stress test configuration
 * Used to generate synthetic telemetry and log data
 */
export interface StressTestConfig {
  eventCount: number;
  logCount: number;
  duration: number; // in milliseconds
  burstSize: number;
}

/**
 * Stress test result
 * Response from stress test execution
 */
export interface StressTestResult {
  success: boolean;
  eventsGenerated: number;
  logsGenerated: number;
  duration: number;
  message: string;
}

/**
 * Source statistics
 * Detailed stats for a single data source
 */
export interface SourceStats {
  source: string;
  totalEvents: number;
  totalLogs: number;
  lastEventTime: Date;
  lastLogTime: Date;
  eventRate: number; // events per minute
}

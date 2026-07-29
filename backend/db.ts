/**
 * In-Memory Data Store
 *
 * Replaces the MySQL/Drizzle backend with a lightweight in-memory store so the
 * demo runs perfectly without any external database.  All data lives in-process
 * and is reset on pod restart — which is fine for a demo.
 *
 * The exported function signatures are IDENTICAL to the original db.ts so no
 * router or router-test code needs to change.
 */

import type {
  IngestTelemetryInput,
  IngestLogInput,
  LogFilterOptions,
  PaginatedResponse,
  TimeSeriesPoint,
  SourceStats,
} from "../shared/types";

// ─── Type mirrors of the Drizzle schema ───────────────────────────────────────

export interface TelemetryEvent {
  id: number;
  name: string;
  value: string;
  tags: Record<string, string>;
  source: string;
  timestamp: Date;
  createdAt: Date;
}

export interface LogEntry {
  id: number;
  level: string;
  message: string;
  source: string;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
  createdAt: Date;
}

export interface DataSource {
  id: number;
  name: string;
  telemetryCount: number;
  logCount: number;
  lastSeen: Date;
  createdAt: Date;
}

// ─── In-memory stores ─────────────────────────────────────────────────────────

let telemetrySeq = 1;
let logSeq = 1;
let sourceSeq = 1;

const telemetryStore: TelemetryEvent[] = [];
const logStore: LogEntry[] = [];
const sourceMap = new Map<string, DataSource>(); // keyed by source name

// ─── Capacity cap — keep memory bounded on t3.micro (1 GB RAM) ───────────────
const MAX_TELEMETRY = 50_000;
const MAX_LOGS = 50_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upsertSource(name: string, telemetryDelta = 0, logDelta = 0): void {
  const existing = sourceMap.get(name);
  if (existing) {
    existing.telemetryCount += telemetryDelta;
    existing.logCount += logDelta;
    existing.lastSeen = new Date();
  } else {
    sourceMap.set(name, {
      id: sourceSeq++,
      name,
      telemetryCount: telemetryDelta,
      logCount: logDelta,
      lastSeen: new Date(),
      createdAt: new Date(),
    });
  }
}

// ─── User management (stubs — auth is disabled for demo) ─────────────────────

export interface InsertUser {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
  role?: string;
}

export async function upsertUser(_user: InsertUser): Promise<void> {
  // No-op in demo mode
}

export async function getUserByOpenId(
  _openId: string
): Promise<InsertUser | undefined> {
  return undefined;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export async function ingestTelemetryEvent(
  input: IngestTelemetryInput
): Promise<TelemetryEvent> {
  const event: TelemetryEvent = {
    id: telemetrySeq++,
    name: input.name,
    value: input.value.toString(),
    tags: (input.tags as Record<string, string>) || {},
    source: input.source,
    timestamp: input.timestamp || new Date(),
    createdAt: new Date(),
  };

  telemetryStore.push(event);

  // Evict oldest events to stay within cap
  if (telemetryStore.length > MAX_TELEMETRY) {
    telemetryStore.splice(0, telemetryStore.length - MAX_TELEMETRY);
  }

  upsertSource(input.source, 1, 0);
  return event;
}

export async function getTelemetryEvents(filters?: {
  source?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}): Promise<TelemetryEvent[]> {
  let results = [...telemetryStore];

  if (filters?.source) {
    results = results.filter((e) => e.source === filters.source);
  }
  if (filters?.startTime) {
    results = results.filter((e) => e.timestamp >= filters.startTime!);
  }
  if (filters?.endTime) {
    results = results.filter((e) => e.timestamp <= filters.endTime!);
  }

  // Newest first
  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}

export async function getTelemetryStats(
  timeWindowMinutes = 60
): Promise<{ totalEvents: number; eventsPerMinute: number; activeSources: number }> {
  const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  const recent = telemetryStore.filter((e) => e.timestamp >= cutoff);
  const activeSources = new Set(recent.map((e) => e.source)).size;

  return {
    totalEvents: recent.length,
    eventsPerMinute: Math.round(recent.length / timeWindowMinutes),
    activeSources,
  };
}

export async function getTelemetryTimeSeries(
  timeWindowMinutes = 60,
  _bucketSizeSeconds = 60
): Promise<TimeSeriesPoint[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);

  // Build 1-minute buckets
  const points: TimeSeriesPoint[] = [];
  for (let i = 0; i < timeWindowMinutes; i++) {
    const bucketTime = new Date(
      now.getTime() - (timeWindowMinutes - i) * 60 * 1000
    );
    points.push({ timestamp: bucketTime, eventCount: 0, errorCount: 0, throughput: 0 });
  }

  // Aggregate events
  const recent = telemetryStore.filter((e) => e.timestamp >= cutoff);
  recent.forEach((event) => {
    const bucketMs =
      Math.floor(event.timestamp.getTime() / 60_000) * 60_000;
    const idx = points.findIndex(
      (p) => Math.floor(p.timestamp.getTime() / 60_000) * 60_000 === bucketMs
    );
    if (idx !== -1) {
      points[idx].eventCount++;
      points[idx].throughput++;
    }
  });

  return points;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function ingestLogEntry(
  input: IngestLogInput
): Promise<LogEntry> {
  const entry: LogEntry = {
    id: logSeq++,
    level: input.level,
    message: input.message,
    source: input.source,
    metadata: (input.metadata as Record<string, unknown>) || null,
    timestamp: input.timestamp || new Date(),
    createdAt: new Date(),
  };

  logStore.push(entry);

  // Evict oldest logs to stay within cap
  if (logStore.length > MAX_LOGS) {
    logStore.splice(0, logStore.length - MAX_LOGS);
  }

  upsertSource(input.source, 0, 1);
  return entry;
}

export async function getLogs(
  filters?: LogFilterOptions & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<LogEntry>> {
  const pageSize = filters?.pageSize || 50;
  const page = filters?.page || 1;
  const offset = (page - 1) * pageSize;

  let results = [...logStore];

  if (filters?.source && filters.source.length > 0) {
    results = results.filter((l) => filters.source!.includes(l.source));
  }
  if (filters?.level && filters.level.length > 0) {
    results = results.filter((l) =>
      (filters.level as string[]).includes(l.level)
    );
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((l) => l.message.toLowerCase().includes(q));
  }
  if (filters?.startTime) {
    results = results.filter((l) => l.timestamp >= filters.startTime!);
  }
  if (filters?.endTime) {
    results = results.filter((l) => l.timestamp <= filters.endTime!);
  }

  // Newest first
  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const total = results.length;
  const items = results.slice(offset, offset + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export async function getLogStats(
  timeWindowMinutes = 60
): Promise<{
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
}> {
  const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  const recent = logStore.filter((l) => l.timestamp >= cutoff);

  return {
    totalLogs: recent.length,
    errorCount: recent.filter((l) => l.level === "ERROR").length,
    warningCount: recent.filter((l) => l.level === "WARN").length,
    infoCount: recent.filter((l) => l.level === "INFO").length,
    debugCount: recent.filter((l) => l.level === "DEBUG").length,
  };
}

// ─── Sources ──────────────────────────────────────────────────────────────────

export async function getSources(): Promise<DataSource[]> {
  return [...sourceMap.values()].sort(
    (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()
  );
}

export async function getSourceStats(): Promise<SourceStats[]> {
  return [...sourceMap.values()]
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
    .map((s) => ({
      source: s.name,
      totalEvents: s.telemetryCount,
      totalLogs: s.logCount,
      lastEventTime: s.lastSeen,
      lastLogTime: s.lastSeen,
      eventRate: Math.round(s.telemetryCount / 60),
    }));
}

// ─── Compatibility stub ───────────────────────────────────────────────────────

/** Not used by in-memory store but kept so imports compile. */
export async function getDb() {
  return null;
}

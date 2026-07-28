import { eq, gte, lte, and, desc, sql, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, telemetryEvents, logEntries, dataSources, type TelemetryEvent, type LogEntry, type DataSource } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { IngestTelemetryInput, IngestLogInput, LogFilterOptions, PaginatedResponse, TimeSeriesPoint, SourceStats } from "../shared/types";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Lazily create the drizzle instance so local tooling can run without a DB.
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * User management
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Telemetry event management
 */
export async function ingestTelemetryEvent(input: IngestTelemetryInput): Promise<TelemetryEvent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const timestamp = input.timestamp || new Date();

  await db.insert(telemetryEvents).values({
    name: input.name,
    value: input.value.toString(),
    tags: input.tags || {},
    source: input.source,
    timestamp,
  });

  // Update or create data source
  await updateDataSourceTelemetry(input.source);

  return {
    id: 0,
    name: input.name,
    value: input.value.toString(),
    tags: input.tags || {},
    source: input.source,
    timestamp,
    createdAt: new Date(),
  };
}

export async function getTelemetryEvents(filters?: { source?: string; startTime?: Date; endTime?: Date; limit?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let whereClause = undefined;

  if (filters?.source) {
    whereClause = eq(telemetryEvents.source, filters.source);
  }

  if (filters?.startTime && filters?.endTime) {
    const timeRange = and(
      gte(telemetryEvents.timestamp, filters.startTime),
      lte(telemetryEvents.timestamp, filters.endTime)
    );
    whereClause = whereClause ? and(whereClause, timeRange) : timeRange;
  }

  const baseQuery = whereClause
    ? db.select().from(telemetryEvents).where(whereClause)
    : db.select().from(telemetryEvents);

  const orderedQuery = baseQuery.orderBy(desc(telemetryEvents.timestamp));

  if (filters?.limit) {
    return orderedQuery.limit(filters.limit);
  }

  return orderedQuery;
}

export async function getTelemetryStats(timeWindowMinutes: number = 60): Promise<{
  totalEvents: number;
  eventsPerMinute: number;
  activeSources: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  try {
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.timestamp, startTime));

    const totalEvents = totalResult[0]?.count || 0;
    const eventsPerMinute = Math.round(totalEvents / timeWindowMinutes);

    const sourcesResult = await db
      .selectDistinct({ source: telemetryEvents.source })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.timestamp, startTime));

    const activeSources = sourcesResult.length;

    return {
      totalEvents,
      eventsPerMinute,
      activeSources,
    };
  } catch (error) {
    console.error("[Telemetry] Stats query error:", error);
    return {
      totalEvents: 0,
      eventsPerMinute: 0,
      activeSources: 0,
    };
  }
}

export async function getTelemetryTimeSeries(
  timeWindowMinutes: number = 60,
  bucketSizeSeconds: number = 60
): Promise<TimeSeriesPoint[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  try {
    // Generate empty time buckets for the entire window
    const now = new Date();
    const timePoints: TimeSeriesPoint[] = [];
    
    for (let i = 0; i < timeWindowMinutes; i++) {
      const bucketTime = new Date(now.getTime() - (timeWindowMinutes - i) * 60 * 1000);
      timePoints.push({
        timestamp: bucketTime,
        eventCount: 0,
        errorCount: 0,
        throughput: 0,
      });
    }

    // Query actual events
    const events = await db
      .select({ timestamp: telemetryEvents.timestamp })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.timestamp, startTime));

    // Aggregate events into time buckets (1-minute buckets)
    const eventsByBucket = new Map<string, number>();
    events.forEach((event) => {
      const bucketTime = new Date(event.timestamp);
      bucketTime.setSeconds(0, 0); // Round down to minute
      const key = bucketTime.toISOString();
      eventsByBucket.set(key, (eventsByBucket.get(key) || 0) + 1);
    });

    // Map aggregated data back to time points
    return timePoints.map((point) => {
      const key = point.timestamp.toISOString();
      const count = eventsByBucket.get(key) || 0;
      return {
        ...point,
        eventCount: count,
        throughput: count,
      };
    });
  } catch (error) {
    console.error("[Telemetry] Time-series query error:", error);
    // Return empty array on error
    return [];
  }
}

/**
 * Log entry management
 */
export async function ingestLogEntry(input: IngestLogInput): Promise<LogEntry> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const timestamp = input.timestamp || new Date();

  await db.insert(logEntries).values({
    level: input.level,
    message: input.message,
    source: input.source,
    metadata: input.metadata || null,
    timestamp,
  });

  // Update or create data source
  await updateDataSourceLogs(input.source);

  return {
    id: 0,
    level: input.level,
    message: input.message,
    source: input.source,
    metadata: input.metadata || null,
    timestamp,
    createdAt: new Date(),
  };
}

export async function getLogs(filters?: LogFilterOptions & { page?: number; pageSize?: number }): Promise<PaginatedResponse<LogEntry>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pageSize = filters?.pageSize || 50;
  const page = filters?.page || 1;
  const offset = (page - 1) * pageSize;

  try {
    let whereClause = undefined;

    if (filters?.source && filters.source.length > 0) {
      whereClause = inArray(logEntries.source, filters.source);
    }

    if (filters?.level && filters.level.length > 0) {
      const levelCondition = inArray(logEntries.level, filters.level);
      whereClause = whereClause ? and(whereClause, levelCondition) : levelCondition;
    }

    if (filters?.search) {
      const searchCondition = like(logEntries.message, `%${filters.search}%`);
      whereClause = whereClause ? and(whereClause, searchCondition) : searchCondition;
    }

    if (filters?.startTime && filters?.endTime) {
      const timeRange = and(
        gte(logEntries.timestamp, filters.startTime),
        lte(logEntries.timestamp, filters.endTime)
      );
      whereClause = whereClause ? and(whereClause, timeRange) : timeRange;
    }

    const baseQuery = whereClause
      ? db.select().from(logEntries).where(whereClause)
      : db.select().from(logEntries);

    const totalResult = await baseQuery;
    const total = totalResult.length;

    const items = await baseQuery
      .orderBy(desc(logEntries.timestamp))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  } catch (error) {
    console.error("[Logs] Query error:", error);
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
  }
}

export async function getLogStats(timeWindowMinutes: number = 60): Promise<{
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  try {
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(logEntries)
      .where(gte(logEntries.timestamp, startTime));

    const errorResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(logEntries)
      .where(and(gte(logEntries.timestamp, startTime), eq(logEntries.level, "ERROR")));

    const warningResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(logEntries)
      .where(and(gte(logEntries.timestamp, startTime), eq(logEntries.level, "WARN")));

    const infoResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(logEntries)
      .where(and(gte(logEntries.timestamp, startTime), eq(logEntries.level, "INFO")));

    const debugResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(logEntries)
      .where(and(gte(logEntries.timestamp, startTime), eq(logEntries.level, "DEBUG")));

    return {
      totalLogs: totalResult[0]?.count || 0,
      errorCount: errorResult[0]?.count || 0,
      warningCount: warningResult[0]?.count || 0,
      infoCount: infoResult[0]?.count || 0,
      debugCount: debugResult[0]?.count || 0,
    };
  } catch (error) {
    console.error("[Logs] Stats query error:", error);
    return {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
    };
  }
}

/**
 * Data source management
 */
export async function getSources(): Promise<DataSource[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await db.select().from(dataSources).orderBy(desc(dataSources.lastSeen));
  } catch (error) {
    console.error("[Sources] Query error:", error);
    return [];
  }
}

export async function getSourceStats(): Promise<SourceStats[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const sources = await db.select().from(dataSources).orderBy(desc(dataSources.lastSeen));
    return sources.map((source) => ({
      source: source.name,
      totalEvents: source.telemetryCount,
      totalLogs: source.logCount,
      lastEventTime: source.lastSeen,
      lastLogTime: source.lastSeen,
      eventRate: Math.round(source.telemetryCount / 60), // Approximate events per minute
    }));
  } catch (error) {
    console.error("[Sources] Stats query error:", error);
    return [];
  }
}

async function updateDataSourceTelemetry(sourceName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.name, sourceName))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(dataSources)
        .set({
          lastSeen: new Date(),
          telemetryCount: (existing[0].telemetryCount || 0) + 1,
        })
        .where(eq(dataSources.name, sourceName));
    } else {
      await db.insert(dataSources).values({
        name: sourceName,
        lastSeen: new Date(),
        telemetryCount: 1,
        logCount: 0,
      });
    }
  } catch (error) {
    console.error("[Sources] Update telemetry error:", error);
  }
}

async function updateDataSourceLogs(sourceName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.name, sourceName))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(dataSources)
        .set({
          lastSeen: new Date(),
          logCount: (existing[0].logCount || 0) + 1,
        })
        .where(eq(dataSources.name, sourceName));
    } else {
      await db.insert(dataSources).values({
        name: sourceName,
        lastSeen: new Date(),
        telemetryCount: 0,
        logCount: 1,
      });
    }
  } catch (error) {
    console.error("[Sources] Update logs error:", error);
  }
}

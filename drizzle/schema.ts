import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Telemetry events table
 * Stores incoming metric data points with tags and source information
 * Indexed on timestamp and source for efficient time-range queries
 */
export const telemetryEvents = mysqlTable(
  "telemetry_events",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    value: decimal("value", { precision: 20, scale: 8 }).notNull(),
    tags: json("tags").$type<Record<string, string>>().default({}),
    source: varchar("source", { length: 255 }).notNull(),
    timestamp: timestamp("timestamp").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index("idx_telemetry_timestamp").on(table.timestamp),
    sourceIdx: index("idx_telemetry_source").on(table.source),
    sourceTimestampIdx: index("idx_telemetry_source_timestamp").on(table.source, table.timestamp),
  })
);

export type TelemetryEvent = typeof telemetryEvents.$inferSelect;
export type InsertTelemetryEvent = typeof telemetryEvents.$inferInsert;

/**
 * Log entries table
 * Stores structured log messages with level, source, and optional metadata
 * Indexed on timestamp and source for efficient filtering
 */
export const logEntries = mysqlTable(
  "log_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    level: mysqlEnum("level", ["DEBUG", "INFO", "WARN", "ERROR"]).notNull(),
    message: text("message").notNull(),
    source: varchar("source", { length: 255 }).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    timestamp: timestamp("timestamp").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index("idx_logs_timestamp").on(table.timestamp),
    sourceIdx: index("idx_logs_source").on(table.source),
    levelIdx: index("idx_logs_level").on(table.level),
    sourceTimestampIdx: index("idx_logs_source_timestamp").on(table.source, table.timestamp),
  })
);

export type LogEntry = typeof logEntries.$inferSelect;
export type InsertLogEntry = typeof logEntries.$inferInsert;

/**
 * Data sources table
 * Tracks unique sources sending telemetry and logs
 * Used for source management and statistics
 */
export const dataSources = mysqlTable(
  "data_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    lastSeen: timestamp("lastSeen").notNull(),
    telemetryCount: int("telemetryCount").default(0).notNull(),
    logCount: int("logCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    lastSeenIdx: index("idx_sources_lastSeen").on(table.lastSeen),
  })
);

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = typeof dataSources.$inferInsert;
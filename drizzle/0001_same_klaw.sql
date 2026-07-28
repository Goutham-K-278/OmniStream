CREATE TABLE `data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`lastSeen` timestamp NOT NULL,
	`telemetryCount` int NOT NULL DEFAULT 0,
	`logCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `data_sources_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` enum('DEBUG','INFO','WARN','ERROR') NOT NULL,
	`message` text NOT NULL,
	`source` varchar(255) NOT NULL,
	`metadata` json,
	`timestamp` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `log_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telemetry_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`value` decimal(20,8) NOT NULL,
	`tags` json DEFAULT ('{}'),
	`source` varchar(255) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telemetry_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sources_lastSeen` ON `data_sources` (`lastSeen`);--> statement-breakpoint
CREATE INDEX `idx_logs_timestamp` ON `log_entries` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_logs_source` ON `log_entries` (`source`);--> statement-breakpoint
CREATE INDEX `idx_logs_level` ON `log_entries` (`level`);--> statement-breakpoint
CREATE INDEX `idx_logs_source_timestamp` ON `log_entries` (`source`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_telemetry_timestamp` ON `telemetry_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_telemetry_source` ON `telemetry_events` (`source`);--> statement-breakpoint
CREATE INDEX `idx_telemetry_source_timestamp` ON `telemetry_events` (`source`,`timestamp`);
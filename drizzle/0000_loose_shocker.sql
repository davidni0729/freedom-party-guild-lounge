CREATE TABLE `event_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'idle' NOT NULL,
	`ends_at` integer,
	`round` integer DEFAULT 0 NOT NULL,
	`match_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`round` integer NOT NULL,
	`participant_id` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `matches_round_participant_idx` ON `matches` (`round`,`participant_id`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`nickname` text NOT NULL,
	`role` text NOT NULL,
	`skills_json` text NOT NULL,
	`greeting` text DEFAULT '' NOT NULL,
	`photo_key` text,
	`wall_enabled` integer DEFAULT 1 NOT NULL,
	`match_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `participants_updated_at_idx` ON `participants` (`updated_at`);--> statement-breakpoint
CREATE INDEX `participants_match_enabled_idx` ON `participants` (`match_enabled`);
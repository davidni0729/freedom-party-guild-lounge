import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  nickname: text("nickname").notNull(),
  role: text("role").notNull(),
  skillsJson: text("skills_json").notNull(),
  greeting: text("greeting").notNull().default(""),
  photoKey: text("photo_key"),
  wallEnabled: integer("wall_enabled").notNull().default(1),
  matchEnabled: integer("match_enabled").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("participants_updated_at_idx").on(table.updatedAt),
  index("participants_match_enabled_idx").on(table.matchEnabled),
]);

export const eventState = sqliteTable("event_state", {
  id: integer("id").primaryKey(),
  mode: text("mode").notNull().default("idle"),
  endsAt: integer("ends_at"),
  round: integer("round").notNull().default(0),
  matchCount: integer("match_count").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  round: integer("round").notNull(),
  participantId: text("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("matches_round_participant_idx").on(table.round, table.participantId),
]);

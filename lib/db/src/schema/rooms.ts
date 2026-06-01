import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull().unique(),
  name: text("name").notNull(),
  hostId: integer("host_id").notNull(),
  hostName: text("host_name").notNull(),
  participantCount: integer("participant_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const roomParticipantsTable = pgTable("room_participants", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, createdAt: true, endedAt: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;

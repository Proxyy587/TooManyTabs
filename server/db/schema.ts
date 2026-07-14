import {
  pgTable,
  text,
  timestamp,
  varchar,
  serial,
  integer,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: varchar("google_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  picture: text("picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }),
  platform: varchar("platform", { length: 50 }),
  refreshTokenHash: text("refresh_token_hash"),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tabGroups = pgTable("tab_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  originDevice: uuid("origin_device").references(() => devices.id, {
    onDelete: "set null",
  }),
  version: integer("version").default(1).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tabs = pgTable("tabs", {
  id: serial("id").primaryKey(),
  tabGroupId: uuid("tab_group_id")
    .notNull()
    .references(() => tabGroups.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  favIconUrl: text("fav_icon_url"),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type TabGroup = typeof tabGroups.$inferSelect;
export type NewTabGroup = typeof tabGroups.$inferInsert;
export type Tab = typeof tabs.$inferSelect;
export type NewTab = typeof tabs.$inferInsert;

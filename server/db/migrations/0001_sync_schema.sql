-- TooManyTabs v2 sync schema
-- Safe to run on a fresh DB or after dropping old sessions/tabs tables

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "google_id" varchar(255) NOT NULL UNIQUE,
  "email" varchar(255) NOT NULL UNIQUE,
  "name" varchar(255),
  "picture" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" varchar(255),
  "platform" varchar(50),
  "refresh_token_hash" text,
  "last_seen_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tab_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" varchar(200) NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "origin_device" uuid REFERENCES "devices"("id") ON DELETE set null,
  "version" integer DEFAULT 1 NOT NULL,
  "deleted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Drop old tabs table that referenced sessions, then recreate for tab_groups
DROP TABLE IF EXISTS "tabs";
DROP TABLE IF EXISTS "sessions";

CREATE TABLE "tabs" (
  "id" serial PRIMARY KEY NOT NULL,
  "tab_group_id" uuid NOT NULL REFERENCES "tab_groups"("id") ON DELETE cascade,
  "url" text NOT NULL,
  "title" varchar(500) NOT NULL,
  "fav_icon_url" text,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tab_groups_user_updated_idx" ON "tab_groups" ("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "tabs_group_idx" ON "tabs" ("tab_group_id");

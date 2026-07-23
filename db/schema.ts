import {
  pgTable,
  text,
  numeric,
  integer,
  date,
  timestamp,
  boolean,
  jsonb,
  serial,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const collectionModeEnum = pgEnum("collection_mode", [
  "cash",
  "cheque",
  "other",
]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  normalizedName: text("normalized_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  reportUserCode: text("report_user_code"),
  accountName: text("account_name").notNull(),
  denomination: numeric("denomination", { precision: 12, scale: 2 }).notNull(),
  monthsPaid: integer("months_paid").notNull(),
  nextDueDate: date("next_due_date", { mode: "string" }),
  // Per-account — India Post revises the RD rate over time, so each account keeps whatever
  // rate was in effect when it was opened. Not present in the DOP report; defaults to 6.7%
  // and is otherwise agent-editable, and never overwritten by re-import.
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull().default("6.7"),
  // Not present in the DOP report either. Backfilled once for existing rows from
  // nextDueDate - (monthsPaid + 1) months; agent-editable afterwards.
  openingDate: date("opening_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  installmentsCovered: integer("installments_covered").notNull().default(1),
  mode: collectionModeEnum("mode").notNull().default("cash"),
  depositedToPO: boolean("deposited_to_po").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportImports = pgTable("report_imports", {
  id: serial("id").primaryKey(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  rawText: text("raw_text").notNull(),
  accountCount: integer("account_count").notNull(),
  diff: jsonb("diff").$type<{
    added: string[];
    removed: string[];
    changed: string[];
  }>(),
});

export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  language: text("language", { enum: ["en", "hi"] }).notNull(),
  body: text("body").notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  client: one(clients, {
    fields: [accounts.clientId],
    references: [clients.id],
  }),
  collections: many(collections),
}));

export const collectionsRelations = relations(collections, ({ one }) => ({
  account: one(accounts, {
    fields: [collections.accountId],
    references: [accounts.id],
  }),
}));

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type CollectionEntry = typeof collections.$inferSelect;
export type NewCollectionEntry = typeof collections.$inferInsert;
export type ReportImport = typeof reportImports.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;

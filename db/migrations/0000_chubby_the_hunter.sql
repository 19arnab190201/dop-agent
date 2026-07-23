CREATE TYPE "public"."collection_mode" AS ENUM('cash', 'cheque', 'other');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"report_user_code" text,
	"account_name" text NOT NULL,
	"denomination" numeric(12, 2) NOT NULL,
	"months_paid" integer NOT NULL,
	"next_due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"normalized_name" text NOT NULL,
	"display_name" text NOT NULL,
	"phone" text,
	"notes" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"installments_covered" integer DEFAULT 1 NOT NULL,
	"mode" "collection_mode" DEFAULT 'cash' NOT NULL,
	"deposited_to_po" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"language" text NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_text" text NOT NULL,
	"account_count" integer NOT NULL,
	"diff" jsonb
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
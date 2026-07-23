ALTER TABLE "accounts" ALTER COLUMN "client_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
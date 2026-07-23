ALTER TABLE "accounts" ADD COLUMN "interest_rate" numeric(5, 2) DEFAULT '6.7' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "opening_date" date;--> statement-breakpoint
-- One-time backfill: opening_date = next_due_date - (months_paid + 1) months, only where
-- derivable (next_due_date present) and not already set.
UPDATE "accounts"
SET "opening_date" = ("next_due_date" - (("months_paid" + 1) || ' months')::interval)::date
WHERE "next_due_date" IS NOT NULL AND "opening_date" IS NULL;
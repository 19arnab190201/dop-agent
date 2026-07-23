import { addMonths, format } from "date-fns";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { accounts, collections, type NewCollectionEntry } from "./schema";

// One installment is paid on the opening date itself, then one per month after —
// matches nextDueDate = openingDate + (monthsPaid + 1) months (see backfill-opening-dates.ts),
// so a fully-seeded account lines up exactly with the nextDueDate already stored on it.
function installmentDates(openingDate: string, monthsPaid: number): string[] {
  const opening = new Date(`${openingDate}T00:00:00`);
  const dates: string[] = [];
  for (let i = 0; i <= monthsPaid; i++) {
    dates.push(format(addMonths(opening, i), "yyyy-MM-dd"));
  }
  return dates;
}

async function seedCollections() {
  const allAccounts = await db
    .select({
      id: accounts.id,
      openingDate: accounts.openingDate,
      monthsPaid: accounts.monthsPaid,
      denomination: accounts.denomination,
    })
    .from(accounts);

  const skippedNoOpeningDate: string[] = [];
  const skippedAlreadySeeded: string[] = [];
  const rows: NewCollectionEntry[] = [];

  for (const account of allAccounts) {
    if (!account.openingDate) {
      skippedNoOpeningDate.push(account.id);
      continue;
    }

    const existing = await db
      .select({ id: collections.id })
      .from(collections)
      .where(sql`${collections.accountId} = ${account.id}`)
      .limit(1);
    if (existing.length > 0) {
      skippedAlreadySeeded.push(account.id);
      continue;
    }

    for (const date of installmentDates(account.openingDate, account.monthsPaid)) {
      rows.push({
        accountId: account.id,
        date,
        amount: account.denomination,
        installmentsCovered: 1,
        mode: "cash",
        depositedToPO: true,
      });
    }
  }

  console.log(`Prepared ${rows.length} collection row(s) for ${allAccounts.length - skippedNoOpeningDate.length - skippedAlreadySeeded.length} account(s).`);
  if (skippedNoOpeningDate.length > 0) {
    console.warn(`Skipped ${skippedNoOpeningDate.length} account(s) with no opening_date:`, skippedNoOpeningDate);
  }
  if (skippedAlreadySeeded.length > 0) {
    console.warn(`Skipped ${skippedAlreadySeeded.length} account(s) that already have collections:`, skippedAlreadySeeded);
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(collections).values(batch);
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log(`Done. Seeded ${rows.length} collection row(s).`);
  process.exit(0);
}

seedCollections().catch((err) => {
  console.error(err);
  process.exit(1);
});

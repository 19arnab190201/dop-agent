import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { accounts } from "./schema";
import { parseDopReport } from "../lib/parser";
import { normalizeName } from "../lib/normalize";
import { resolveClientIds } from "../lib/resolveClients";

async function seed() {
  const rawText = readFileSync(path.join(__dirname, "sample-report.txt"), "utf-8");
  const { rows, errors } = parseDopReport(rawText);

  if (errors.length > 0) {
    console.warn(`Parser reported ${errors.length} unparseable line(s):`, errors);
  }

  console.log(`Parsed ${rows.length} accounts. Seeding...`);

  const clientIdByName = await resolveClientIds(
    db,
    rows.map((row) => ({ normalizedName: normalizeName(row.accountName), displayName: row.accountName.trim() }))
  );

  await db
    .insert(accounts)
    .values(
      rows.map((row) => ({
        id: row.accountNo,
        clientId: clientIdByName.get(normalizeName(row.accountName))!,
        reportUserCode: row.reportUserCode,
        accountName: row.accountName.trim(),
        denomination: row.denomination.toString(),
        monthsPaid: row.monthsPaid,
        nextDueDate: row.nextDueDate,
      }))
    )
    .onConflictDoUpdate({
      target: accounts.id,
      set: {
        accountName: sql`excluded.account_name`,
        denomination: sql`excluded.denomination`,
        monthsPaid: sql`excluded.months_paid`,
        nextDueDate: sql`excluded.next_due_date`,
      },
    });

  console.log(`Seeded ${clientIdByName.size} clients and ${rows.length} accounts.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

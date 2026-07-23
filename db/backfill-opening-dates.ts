import { sql } from "drizzle-orm";
import { db } from "./index";

async function run() {
  const result = await db.execute(sql`
    update accounts
    set opening_date = (next_due_date - ((months_paid + 1) || ' months')::interval)::date
    where next_due_date is not null and opening_date is null
  `);
  console.log(`Backfilled opening_date for ${result.count ?? 0} account(s).`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

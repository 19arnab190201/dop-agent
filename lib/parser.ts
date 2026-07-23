import { parse, format, isValid } from "date-fns";

export interface ParsedAccountRow {
  reportUserCode: string;
  selectNo: number;
  accountNo: string;
  accountName: string;
  denomination: number;
  monthsPaid: number;
  nextDueDate: string | null; // ISO yyyy-mm-dd
}

export interface ParseError {
  line: string;
  reason: string;
}

export interface ParseResult {
  rows: ParsedAccountRow[];
  errors: ParseError[];
}

function parseDDMMYYYY(raw: string | undefined): string | null {
  if (!raw) return null;
  const d = parse(raw, "dd-MM-yyyy", new Date());
  if (!isValid(d)) return null;
  return format(d, "yyyy-MM-dd");
}

function parseDenomination(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/cr\.?/i, "").trim();
  return parseFloat(cleaned);
}

/**
 * Parses the pasted DOP "Deposit Accounts List" report.
 * Columns are separated by tabs or runs of 2+ spaces; account names may
 * legitimately contain single spaces and occasionally wrap onto their own line.
 */
export function parseDopReport(raw: string): ParseResult {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: ParsedAccountRow[] = [];
  const errors: ParseError[] = [];

  for (const line of lines) {
    if (/user\s*id/i.test(line) && /account\s*no/i.test(line)) continue;
    if (/^select\b/i.test(line)) continue;

    const parts = line
      .split(/\t+| {2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length < 6) {
      if (rows.length > 0 && !/^\d/.test(line)) {
        rows[rows.length - 1].accountName += ` ${line}`.trim();
        continue;
      }
      errors.push({ line, reason: `Expected at least 6 columns, found ${parts.length}` });
      continue;
    }

    const [reportUserCode, selectNoRaw, accountNo, accountName, denominationRaw, monthsPaidRaw, nextDueDateRaw] =
      parts;

    if (!/^\d+$/.test(accountNo)) {
      errors.push({ line, reason: `Account number "${accountNo}" is not numeric` });
      continue;
    }

    const denomination = parseDenomination(denominationRaw);
    const monthsPaid = parseInt(monthsPaidRaw, 10);

    if (Number.isNaN(denomination) || Number.isNaN(monthsPaid)) {
      errors.push({ line, reason: "Could not parse denomination or months paid" });
      continue;
    }

    rows.push({
      reportUserCode,
      selectNo: parseInt(selectNoRaw, 10) || 0,
      accountNo,
      accountName: accountName.trim(),
      denomination,
      monthsPaid,
      nextDueDate: parseDDMMYYYY(nextDueDateRaw),
    });
  }

  return { rows, errors };
}

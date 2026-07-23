import { differenceInCalendarMonths, differenceInCalendarDays } from "date-fns";
import { RD_RULES, type RdRules } from "@/config/rdRules";
import type { Account } from "@/db/schema";

export type AccountStatus =
  | "current"
  | "dueSoon"
  | "overdue1"
  | "overdue2-3"
  | "critical"
  | "matured";

export interface DerivedAccount extends Omit<Account, "denomination" | "interestRate"> {
  denomination: number;
  interestRate: number;
  status: AccountStatus;
  monthsOverdue: number;
  defaultFeeOwed: number;
  amountToClear: number;
  monthsToMaturity: number;
  expectedCommission: number;
  daysToDiscontinuation: number | null;
  // Past the original 60-month tenure but still being paid (India Post allows continuation
  // in 12-month blocks). Distinct from `status === "matured"`, which can still fire for an
  // extended account that's overdue right now — overdue always takes priority over "matured".
  isExtended: boolean;
  monthsBeyondMaturity: number;
  pastMaxExtension: boolean;
}

// Severity, worst first — used both for sorting and for rolling a client's status up from its accounts.
const STATUS_SEVERITY: AccountStatus[] = ["critical", "overdue2-3", "overdue1", "dueSoon", "current", "matured"];

function computeMonthsOverdue(nextDueDate: string | null, today: Date): number {
  if (!nextDueDate) return 0;
  const due = new Date(nextDueDate);
  if (due > today) return 0;
  // The just-missed installment counts as month 1 overdue, not 0.
  return differenceInCalendarMonths(today, due) + 1;
}

function computeStatus(
  monthsPaid: number,
  nextDueDate: string | null,
  monthsOverdue: number,
  today: Date,
  rules: RdRules
): AccountStatus {
  // Overdue always wins, even for an extended account past 60 months — it's still an active,
  // being-paid account and a missed installment is just as real as it would be before maturity.
  if (monthsOverdue >= rules.discontinuationDefaultCount) return "critical";
  if (monthsOverdue >= 2) return "overdue2-3";
  if (monthsOverdue === 1) return "overdue1";
  if (monthsPaid >= rules.tenureMonths) return "matured";
  if (nextDueDate) {
    const daysUntilDue = differenceInCalendarDays(new Date(nextDueDate), today);
    if (daysUntilDue >= 0 && daysUntilDue <= rules.dueSoonDays) return "dueSoon";
  }
  return "current";
}

export function deriveAccount(account: Account, today: Date = new Date(), rules: RdRules = RD_RULES): DerivedAccount {
  const denomination = Number(account.denomination);
  const interestRate = Number(account.interestRate);
  const monthsOverdue = computeMonthsOverdue(account.nextDueDate, today);
  const status = computeStatus(account.monthsPaid, account.nextDueDate, monthsOverdue, today, rules);
  const defaultFeeOwed = monthsOverdue * (denomination / 100) * rules.defaultFeePerHundredPerMonth;
  const amountToClear = monthsOverdue * denomination + defaultFeeOwed;
  const monthsToMaturity = Math.max(0, rules.tenureMonths - account.monthsPaid);
  const expectedCommission = denomination * rules.agentCommissionRate;
  const daysToDiscontinuation =
    monthsOverdue > 0 && monthsOverdue < rules.discontinuationDefaultCount
      ? (rules.discontinuationDefaultCount - monthsOverdue) * 30
      : null;
  const monthsBeyondMaturity = Math.max(0, account.monthsPaid - rules.tenureMonths);
  const isExtended = monthsBeyondMaturity > 0;
  const pastMaxExtension = account.monthsPaid > rules.maxExtensionMonths;

  return {
    ...account,
    denomination,
    interestRate,
    status,
    monthsOverdue,
    defaultFeeOwed,
    amountToClear,
    monthsToMaturity,
    expectedCommission,
    daysToDiscontinuation,
    isExtended,
    monthsBeyondMaturity,
    pastMaxExtension,
  };
}

// Simplified declining-balance approximation (ignores exact quarterly compounding) — always
// surface this as an estimate to the agent, never as the official maturity value from the PO.
export function estimateMaturityValue(denomination: number, tenureMonths: number, annualRatePercent: number): number {
  const principal = denomination * tenureMonths;
  const interest = denomination * (annualRatePercent / 100) * (tenureMonths * (tenureMonths + 1)) / (2 * 12);
  return principal + interest;
}

export function maturityFlagLabel(account: DerivedAccount): string | null {
  if (account.pastMaxExtension) {
    return `Past ${RD_RULES.maxExtensionMonths}-month limit — must close with PO`;
  }
  if (account.isExtended) {
    return `Extended ${account.monthsBeyondMaturity}mo past maturity — verify with PO`;
  }
  return null;
}

export function worstStatus(statuses: AccountStatus[]): AccountStatus {
  if (statuses.length === 0) return "current";
  let worstIndex = STATUS_SEVERITY.length;
  for (const s of statuses) {
    const idx = STATUS_SEVERITY.indexOf(s);
    if (idx !== -1 && idx < worstIndex) worstIndex = idx;
  }
  return STATUS_SEVERITY[worstIndex] ?? "current";
}

export function statusLabel(status: AccountStatus): string {
  switch (status) {
    case "current":
      return "Current";
    case "dueSoon":
      return "Due soon";
    case "overdue1":
      return "1 month overdue";
    case "overdue2-3":
      return "2–3 months overdue";
    case "critical":
      return "Critical (4+ overdue)";
    case "matured":
      return "Matured";
  }
}

export function statusColor(status: AccountStatus): string {
  switch (status) {
    case "current":
      return "text-emerald-600 dark:text-emerald-400";
    case "dueSoon":
      return "text-yellow-600 dark:text-yellow-400";
    case "overdue1":
      return "text-yellow-600 dark:text-yellow-400";
    case "overdue2-3":
      return "text-orange-600 dark:text-orange-400";
    case "critical":
      return "text-red-600 dark:text-red-400";
    case "matured":
      return "text-blue-600 dark:text-blue-400";
  }
}

export function statusDotClass(status: AccountStatus): string {
  switch (status) {
    case "current":
      return "bg-emerald-500";
    case "dueSoon":
      return "bg-yellow-500";
    case "overdue1":
      return "bg-yellow-500";
    case "overdue2-3":
      return "bg-orange-500";
    case "critical":
      return "bg-red-500";
    case "matured":
      return "bg-blue-500";
  }
}

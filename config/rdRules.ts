export const RD_RULES = {
  tenureMonths: 60,
  // RD accounts can be continued past the 60-month maturity in 12-month blocks, up to a
  // further 5 years (India Post rule) — 120 months total before the account must be closed.
  maxExtensionMonths: 120,
  defaultFeePerHundredPerMonth: 1,
  discontinuationDefaultCount: 4,
  agentCommissionRate: 0.04,
  advanceRebate: {
    sixMonth: { months: 6, perHundred: 10 },
    twelveMonth: { months: 12, perHundred: 40 },
  },
  dueSoonDays: 7,
  assumedAnnualInterestRate: 6.7,
};

export type RdRules = typeof RD_RULES;

export const OVERRIDABLE_RULE_KEYS = [
  "defaultFeePerHundredPerMonth",
  "discontinuationDefaultCount",
  "agentCommissionRate",
  "assumedAnnualInterestRate",
] as const satisfies (keyof RdRules)[];

export function mergeRdRules(overrides: Partial<RdRules> | null | undefined): RdRules {
  return { ...RD_RULES, ...overrides };
}

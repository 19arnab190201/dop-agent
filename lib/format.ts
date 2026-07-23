const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateDisplay(iso: string | null): string {
  if (!iso) return "—";
  return dateFormatter.format(new Date(iso));
}

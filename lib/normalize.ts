export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

interface MergeableClient {
  displayName: string;
  phone: string | null;
  notes: string | null;
  tags: string[];
}

export function mergeClientFields<T extends MergeableClient>(
  primary: T,
  secondary: T
): Pick<MergeableClient, "displayName" | "phone" | "notes" | "tags"> {
  return {
    displayName: primary.displayName || secondary.displayName,
    phone: primary.phone ?? secondary.phone,
    notes: [primary.notes, secondary.notes].filter(Boolean).join("\n") || null,
    tags: Array.from(new Set([...primary.tags, ...secondary.tags])),
  };
}

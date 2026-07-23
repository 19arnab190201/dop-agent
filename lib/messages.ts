import { formatINR, formatDateDisplay } from "@/lib/format";

export type TemplateLanguage = "en" | "hi";

export type TemplatePlaceholders = {
  name: string;
  amount?: string;
  dueDate?: string;
  penalty?: string;
  accountsList?: string;
};

export const DEFAULT_TEMPLATES: Record<string, Record<TemplateLanguage, string>> = {
  reminder: {
    en: "Hi {name}, your RD installment of {amount} is due on {dueDate}. Please arrange payment. — Your Post Office agent",
    hi: "नमस्ते {name}, आपकी RD किस्त {amount} की देय तिथि {dueDate} है। कृपया भुगतान करें। — आपका पोस्ट ऑफिस एजेंट",
  },
  recovery: {
    en: "Hi {name}, your RD account is overdue. Total amount to clear (including default fee {penalty}) is {amount}. Please pay at the earliest to avoid discontinuation.",
    hi: "नमस्ते {name}, आपका RD खाता बकाया है। जुर्माने {penalty} सहित कुल देय राशि {amount} है। कृपया शीघ्र भुगतान करें अन्यथा खाता बंद हो सकता है।",
  },
  combinedReminder: {
    en: "Hi {name}, here are your pending RD dues:\n{accountsList}\nTotal: {amount}. Please arrange payment at your earliest convenience.",
    hi: "नमस्ते {name}, आपकी लंबित RD किस्तें:\n{accountsList}\nकुल: {amount}। कृपया शीघ्र भुगतान करें।",
  },
  maturityPitch: {
    en: "Congratulations {name}! Your RD account is maturing soon (approx. value {amount}). Let's discuss reinvesting in a fresh RD for continued returns.",
    hi: "बधाई हो {name}! आपका RD खाता जल्द परिपक्व हो रहा है (अनुमानित राशि {amount})। नई RD में पुनर्निवेश पर चर्चा करते हैं।",
  },
};

export function renderTemplate(template: string, placeholders: TemplatePlaceholders): string {
  return template
    .replaceAll("{name}", placeholders.name)
    .replaceAll("{amount}", placeholders.amount ?? "")
    .replaceAll("{dueDate}", placeholders.dueDate ?? "")
    .replaceAll("{penalty}", placeholders.penalty ?? "")
    .replaceAll("{accountsList}", placeholders.accountsList ?? "");
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

export function buildTelLink(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function formatAccountsListForMessage(
  accounts: { accountName: string; id: string; amount: number; dueDate: string | null }[]
): string {
  return accounts
    .map((a) => `• …${a.id.slice(-4)} — ${formatINR(a.amount)} (due ${formatDateDisplay(a.dueDate)})`)
    .join("\n");
}

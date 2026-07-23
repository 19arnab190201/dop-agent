"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Copy } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_TEMPLATES, renderTemplate, buildWhatsAppLink, type TemplateLanguage } from "@/lib/messages";
import { formatINR, formatDateDisplay } from "@/lib/format";

export interface ReminderTarget {
  clientName: string;
  clientPhone?: string | null;
  amount: number;
  dueDate?: string | null;
  penalty?: number;
  accountsList?: string;
  kind: keyof typeof DEFAULT_TEMPLATES;
}

// Pass this as the `key` prop at each call site so the sheet remounts (and re-derives its
// editable draft) whenever a genuinely different target is opened, instead of syncing via effect.
export function reminderSheetKey(target: ReminderTarget | null): string {
  return target ? `${target.kind}|${target.clientName}|${target.amount}|${target.dueDate ?? ""}` : "empty";
}

function buildMessage(
  target: ReminderTarget,
  language: TemplateLanguage,
  templates: typeof DEFAULT_TEMPLATES
): string {
  return renderTemplate(templates[target.kind][language], {
    name: target.clientName,
    amount: formatINR(target.amount),
    dueDate: target.dueDate ? formatDateDisplay(target.dueDate) : "",
    penalty: target.penalty ? formatINR(target.penalty) : "",
    accountsList: target.accountsList ?? "",
  });
}

export function ReminderSheet({
  target,
  open,
  onOpenChange,
  language = "en",
  templates = DEFAULT_TEMPLATES,
}: {
  target: ReminderTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: TemplateLanguage;
  templates?: typeof DEFAULT_TEMPLATES;
}) {
  const [message, setMessage] = useState(() => (target ? buildMessage(target, language, templates) : ""));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Send reminder</SheetTitle>
          <SheetDescription>{target?.clientName}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
          {!target?.clientPhone && (
            <p className="text-xs text-muted-foreground">
              No phone number saved for this client — add one from the Clients tab to send via WhatsApp.
            </p>
          )}
        </div>
        <SheetFooter className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(message);
              toast.success("Message copied");
            }}
          >
            <Copy />
            Copy
          </Button>
          <Button
            disabled={!target?.clientPhone}
            render={<a href={target?.clientPhone ? buildWhatsAppLink(target.clientPhone, message) : undefined} target="_blank" />}
          >
            <MessageCircle />
            WhatsApp
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

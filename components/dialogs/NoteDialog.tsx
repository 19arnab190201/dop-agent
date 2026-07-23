"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateClient } from "@/lib/actions";

export function NoteDialog({
  clientId,
  clientName,
  initialNote,
  open,
  onOpenChange,
}: {
  clientId: string | null;
  clientName?: string;
  initialNote?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Parent keys this component by clientId, so a remount (not an effect) resets the draft per client.
  const [note, setNote] = useState(initialNote ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    if (!clientId) return;
    startTransition(async () => {
      await updateClient(clientId, { notes: note || null });
      toast.success("Note saved");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Note — {clientName}</DialogTitle>
        </DialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="e.g. pays on 25th, shop at market" />
        <DialogFooter>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

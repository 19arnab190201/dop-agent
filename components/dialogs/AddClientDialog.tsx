"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/actions";

export function AddClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();

  function reset(nextOpen: boolean) {
    if (nextOpen) {
      setName("");
      setPhone("");
    }
    setOpen(nextOpen);
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Enter a name");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createClient({ displayName: name, phone: phone || null });
        toast.success(`Added ${created.displayName}`);
        setOpen(false);
        router.push(`/clients/${created.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add client");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add client
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-phone">Phone (optional)</Label>
            <Input id="client-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone number" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Adding..." : "Add client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

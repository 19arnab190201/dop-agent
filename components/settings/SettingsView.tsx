"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Upload, Trash2, GitMerge } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  updateAppSetting,
  upsertMessageTemplate,
  mergeClients,
  exportBackup,
  restoreBackup,
  clearAllData,
} from "@/lib/actions";
import { DEFAULT_TEMPLATES, type TemplateLanguage } from "@/lib/messages";
import { OVERRIDABLE_RULE_KEYS, type RdRules } from "@/config/rdRules";

const TEMPLATE_LABELS: Record<keyof typeof DEFAULT_TEMPLATES, string> = {
  reminder: "Reminder (due soon)",
  recovery: "Recovery (overdue)",
  combinedReminder: "Combined reminder (all dues)",
  maturityPitch: "Maturity pitch",
};

const RULE_LABELS: Record<(typeof OVERRIDABLE_RULE_KEYS)[number], string> = {
  defaultFeePerHundredPerMonth: "Default fee (₹ per ₹100/month)",
  discontinuationDefaultCount: "Discontinuation after (missed months)",
  agentCommissionRate: "Commission rate (%)",
  assumedAnnualInterestRate: "Assumed RD interest rate (% p.a., for estimates)",
};

export function SettingsView({
  rules,
  templates,
  language,
  clientsList,
}: {
  rules: RdRules;
  templates: typeof DEFAULT_TEMPLATES;
  language: TemplateLanguage;
  clientsList: { id: string; displayName: string; accountCount: number }[];
}) {
  const [pending, startTransition] = useTransition();
  const [ruleForm, setRuleForm] = useState({
    defaultFeePerHundredPerMonth: rules.defaultFeePerHundredPerMonth,
    discontinuationDefaultCount: rules.discontinuationDefaultCount,
    agentCommissionRate: rules.agentCommissionRate * 100,
    assumedAnnualInterestRate: rules.assumedAnnualInterestRate,
  });
  const [templateForm, setTemplateForm] = useState(templates);
  const [primaryClient, setPrimaryClient] = useState<string>("");
  const [secondaryClient, setSecondaryClient] = useState<string>("");
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [restoreText, setRestoreText] = useState("");

  function saveLanguage(value: TemplateLanguage) {
    startTransition(async () => {
      await updateAppSetting("language", value);
      toast.success("Language preference saved");
    });
  }

  function saveRules() {
    startTransition(async () => {
      await updateAppSetting("rdRules", { ...ruleForm, agentCommissionRate: ruleForm.agentCommissionRate / 100 });
      toast.success("Rate overrides saved");
    });
  }

  function saveTemplate(key: keyof typeof DEFAULT_TEMPLATES, lang: TemplateLanguage) {
    startTransition(async () => {
      await upsertMessageTemplate(key, lang, templateForm[key][lang]);
      toast.success("Template saved");
    });
  }

  function doMerge() {
    startTransition(async () => {
      await mergeClients(primaryClient, secondaryClient);
      toast.success("Clients merged");
      setMergeConfirmOpen(false);
      setPrimaryClient("");
      setSecondaryClient("");
    });
  }

  function downloadBackup() {
    startTransition(async () => {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rd-agent-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    });
  }

  function doRestore() {
    startTransition(async () => {
      try {
        const parsed = JSON.parse(restoreText);
        await restoreBackup(parsed);
        toast.success("Backup restored");
        setRestoreText("");
      } catch {
        toast.error("Invalid backup JSON");
      }
    });
  }

  function doClear() {
    startTransition(async () => {
      await clearAllData();
      toast.success("All data cleared");
      setClearConfirmOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Language</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={(v) => saveLanguage(v as TemplateLanguage)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rate overrides</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {OVERRIDABLE_RULE_KEYS.map((key) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <Label htmlFor={key}>{RULE_LABELS[key]}</Label>
                  <Input
                    id={key}
                    type="number"
                    value={ruleForm[key]}
                    onChange={(e) => setRuleForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ))}
              <Button onClick={saveRules} disabled={pending} className="w-fit">
                Save rate overrides
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="flex flex-col gap-4">
          {(Object.keys(DEFAULT_TEMPLATES) as (keyof typeof DEFAULT_TEMPLATES)[]).map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-sm">{TEMPLATE_LABELS[key]}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {(["en", "hi"] as TemplateLanguage[]).map((lang) => (
                  <div key={lang} className="flex flex-col gap-1.5">
                    <Label>{lang === "en" ? "English" : "Hindi"}</Label>
                    <Textarea
                      value={templateForm[key][lang]}
                      onChange={(e) =>
                        setTemplateForm((f) => ({ ...f, [key]: { ...f[key], [lang]: e.target.value } }))
                      }
                      rows={3}
                    />
                    <Button size="sm" variant="outline" className="w-fit" onClick={() => saveTemplate(key, lang)}>
                      Save
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            Placeholders: {"{name}"}, {"{amount}"}, {"{dueDate}"}, {"{penalty}"}, {"{accountsList}"}
          </p>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Merge clients</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Use this when the same person appears twice due to a spelling variant (e.g. &quot;ROYCHOUDHURY&quot;
                vs &quot;ROY CHOUDHURY&quot;). The secondary client&apos;s accounts, phone, notes and tags move into
                the primary; the secondary record is deleted.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Keep (primary)</Label>
                  <Select value={primaryClient} onValueChange={(v) => setPrimaryClient(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsList.map((c) => (
                        <SelectItem key={c.id} value={c.id} disabled={c.id === secondaryClient}>
                          {c.displayName} ({c.accountCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Merge into it (secondary)</Label>
                  <Select value={secondaryClient} onValueChange={(v) => setSecondaryClient(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsList.map((c) => (
                        <SelectItem key={c.id} value={c.id} disabled={c.id === primaryClient}>
                          {c.displayName} ({c.accountCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-fit"
                disabled={!primaryClient || !secondaryClient}
                onClick={() => setMergeConfirmOpen(true)}
              >
                <GitMerge />
                Merge
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Backup</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button className="w-fit" onClick={downloadBackup} disabled={pending}>
                <Download />
                Export full backup (JSON)
              </Button>
              <div className="flex flex-col gap-1.5">
                <Label>Restore from backup JSON</Label>
                <Textarea value={restoreText} onChange={(e) => setRestoreText(e.target.value)} rows={4} placeholder="Paste backup JSON..." />
                <Button variant="outline" className="w-fit" onClick={doRestore} disabled={pending || !restoreText.trim()}>
                  <Upload />
                  Restore
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-sm text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setClearConfirmOpen(true)}>
                <Trash2 />
                Clear all data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={mergeConfirmOpen} onOpenChange={setMergeConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge these clients?</DialogTitle>
            <DialogDescription>This cannot be undone. The secondary client record will be deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={doMerge} disabled={pending}>
              Yes, merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all data?</DialogTitle>
            <DialogDescription>
              This permanently deletes every client, account, collection, template and setting. Export a backup first
              if you&apos;re not sure.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={doClear} disabled={pending}>
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

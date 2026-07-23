"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, ClipboardPaste, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { previewImport, commitImport, type ImportPreview } from "@/lib/actions";
import { formatINR, formatDateDisplay } from "@/lib/format";

export function ImportView() {
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [diff, setDiff] = useState<{ added: string[]; removed: string[]; changed: string[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".txt")) {
      toast.error("Only .txt paste/upload is supported — PDF text extraction isn't reliable enough for this report format. Open the PDF and paste the text instead.");
      return;
    }
    file.text().then(setRawText);
  }

  function runPreview() {
    if (!rawText.trim()) {
      toast.error("Paste or upload the report text first");
      return;
    }
    startTransition(async () => {
      const result = await previewImport(rawText);
      setPreview(result);
      setDiff(null);
    });
  }

  function runCommit() {
    startTransition(async () => {
      const result = await commitImport(rawText);
      setDiff(result);
      toast.success(`Imported ${preview?.accountCount ?? 0} accounts`);
    });
  }

  function reset() {
    setRawText("");
    setPreview(null);
    setDiff(null);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Import DOP report</h1>
        <p className="text-sm text-muted-foreground">
          Paste the &quot;Deposit Accounts List&quot; report text, preview the parsed rows, then commit.
        </p>
      </div>

      <Textarea
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          setPreview(null);
          setDiff(null);
        }}
        rows={10}
        placeholder="Paste report text here..."
        className="font-mono text-xs"
      />

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload />
          Upload .txt
        </Button>
        <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
        <Button onClick={runPreview} disabled={pending} className="ml-auto">
          <ClipboardPaste />
          Preview
        </Button>
      </div>

      {preview && !diff && (
        <div className="flex flex-col gap-3">
          <Alert>
            <CheckCircle2 />
            <AlertTitle>
              Parsed {preview.accountCount} accounts{preview.errors.length > 0 ? ` — ${preview.errors.length} lines skipped` : " — looks right?"}
            </AlertTitle>
          </Alert>

          {preview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Unparsed lines</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {preview.errors.slice(0, 10).map((e, i) => (
                    <li key={i} className="truncate">
                      {e.reason}: {e.line}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Denom.</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Due date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.slice(0, 50).map((row) => (
                  <TableRow key={row.accountNo}>
                    <TableCell>…{row.accountNo.slice(-4)}</TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell>{formatINR(row.denomination)}</TableCell>
                    <TableCell>{row.monthsPaid}</TableCell>
                    <TableCell>{formatDateDisplay(row.nextDueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {preview.rows.length > 50 && (
              <p className="p-2 text-center text-xs text-muted-foreground">
                Showing first 50 of {preview.rows.length} rows
              </p>
            )}
          </div>

          <Button onClick={runCommit} disabled={pending}>
            {pending ? "Committing..." : `Commit ${preview.accountCount} accounts`}
          </Button>
        </div>
      )}

      {diff && (
        <div className="flex flex-col gap-3">
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Import committed</AlertTitle>
            <AlertDescription>Phone numbers, notes, and tags are preserved across imports.</AlertDescription>
          </Alert>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md border p-3">
              <div className="text-lg font-semibold">{diff.added.length}</div>
              <Badge variant="secondary">Added</Badge>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-lg font-semibold">{diff.changed.length}</div>
              <Badge variant="secondary">Months changed</Badge>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-lg font-semibold">{diff.removed.length}</div>
              <Badge variant="secondary">Missing this time</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={reset}>
            Import another report
          </Button>
        </div>
      )}
    </div>
  );
}

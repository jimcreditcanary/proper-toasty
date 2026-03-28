"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Upload, FileText, Loader2 } from "lucide-react";

export function UploadDialog({ credits }: { credits: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      // Auto-run verification
      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: data.scan_id }),
      });
      const verifyData = await verifyRes.json();
      console.log("Verify response:", verifyRes.status, verifyData);

      setOpen(false);
      setFile(null);
      router.push(`/dashboard/scans/${data.scan_id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  const disabled = credits < 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disabled} />}>
        <Upload className="size-4 mr-1.5" />
        Verify an invoice
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload invoice</DialogTitle>
          <DialogDescription>
            Upload a PDF or image of an invoice to verify. This will use 1
            credit.
          </DialogDescription>
        </DialogHeader>

        <div
          className="mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {file ? (
            <>
              <FileText className="mb-2 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setFile(null)}
              >
                Remove
              </Button>
            </>
          ) : (
            <>
              <Upload className="mb-2 size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop or{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-4"
                  onClick={() => inputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, PNG, JPG up to 10MB
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="outline" disabled={uploading} />}>
            Cancel
          </DialogClose>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Upload & verify"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

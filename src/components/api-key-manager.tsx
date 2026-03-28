"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, RefreshCw, Eye, EyeOff } from "lucide-react";

export function ApiKeyManager({ initialKey }: { initialKey: string | null }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  async function generateKey() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/api-key", { method: "POST" });
      const data = await res.json();
      if (data.api_key) {
        setApiKey(data.api_key);
        setVisible(true); // Show the new key immediately
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function maskKey(key: string) {
    if (key.length <= 8) return "•".repeat(key.length);
    return key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4);
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          No API key generated yet. Create one to start using the API.
        </p>
        <Button onClick={generateKey} disabled={loading}>
          {loading ? "Generating..." : "Generate API key"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
          {visible ? apiKey : maskKey(apiKey)}
        </code>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setVisible(!visible)}
          title={visible ? "Hide key" : "Show key"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={copyKey}
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={generateKey}
          disabled={loading}
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
          Regenerate key
        </Button>
        <Badge variant="secondary">
          {copied ? "Copied!" : "Keep this secret"}
        </Badge>
      </div>
    </div>
  );
}

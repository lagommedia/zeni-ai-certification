"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable or blocked (e.g. insecure context) — the
      // button just won't confirm; nothing else to do client-side.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-sapphire-light/70 px-4 py-3">
      <p className="text-sm font-medium text-onyx">{text}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="shrink-0 bg-card text-xs tracking-wide uppercase"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

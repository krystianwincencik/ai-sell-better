"use client";

import { useState } from "react";

export function CopyDescriptionButton({ description }: { description: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-3 cursor-pointer text-sm font-medium text-blue-600 transition-all duration-200 hover:underline active:scale-95"
    >
      {copied ? "Copied" : "Copy description"}
    </button>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? "default" : "outline"}
      className={className}
      disabled={!text}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          コピーしました！
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          コピーする
        </>
      )}
    </Button>
  );
}

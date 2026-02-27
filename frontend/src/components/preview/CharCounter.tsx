import { cn } from "@/lib/utils";
import { countHpbCharacters, countStandardCharacters } from "@/lib/utils";

interface CharCounterProps {
  text: string;
  maxChars: number;
  charCountMode?: "hpb" | "standard";
  className?: string;
}

export default function CharCounter({
  text,
  maxChars,
  charCountMode = "hpb",
  className,
}: CharCounterProps) {
  const currentChars =
    charCountMode === "standard"
      ? countStandardCharacters(text)
      : countHpbCharacters(text);
  const isOverLimit = currentChars > maxChars;
  const percentage = Math.min(100, (currentChars / maxChars) * 100);

  const modeLabel = charCountMode === "standard" ? "文字数" : "HPB基準";
  const overLimitMessage =
    charCountMode === "standard"
      ? "推奨文字数を超えています。"
      : "文字数が上限を超えています。HPBに掲載するには文字数を削減してください。";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-sm">
        <span className={cn(isOverLimit && "text-red-500 font-medium")}>
          {currentChars.toLocaleString()} / {maxChars.toLocaleString()} 文字
          {isOverLimit && ` (+${(currentChars - maxChars).toLocaleString()})`}
        </span>
        <span className="text-muted-foreground">{modeLabel}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isOverLimit ? "bg-red-500" : percentage > 80 ? "bg-yellow-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {isOverLimit && (
        <p className="text-xs text-red-500">
          {overLimitMessage}
        </p>
      )}
    </div>
  );
}

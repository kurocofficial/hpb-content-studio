import { cn } from "@/lib/utils";
import { countHpbCharacters, countStandardCharacters } from "@/lib/utils";

interface CharCounterProps {
  text: string;
  maxChars: number;
  charCountMode?: "hpb" | "standard";
  targetChars?: number;
  className?: string;
}

export default function CharCounter({
  text,
  maxChars,
  charCountMode = "hpb",
  targetChars,
  className,
}: CharCounterProps) {
  const currentChars =
    charCountMode === "standard"
      ? countStandardCharacters(text)
      : countHpbCharacters(text);

  const target = targetChars ?? maxChars;
  const minRange = Math.floor(target * 0.96);
  const maxRange = Math.ceil(target * 1.04);
  const isOverLimit = currentChars > maxChars;
  const inTargetRange = currentChars >= minRange && currentChars <= maxRange;
  const percentage = Math.min(100, (currentChars / maxChars) * 100);

  const modeLabel = charCountMode === "standard" ? "文字数" : "HPB基準";
  const overLimitMessage =
    charCountMode === "standard"
      ? "推奨文字数を超えています。"
      : "文字数が上限を超えています。HPBに掲載するには文字数を削減してください。";

  const barColor = isOverLimit
    ? "bg-red-500"
    : inTargetRange
    ? "bg-green-500"
    : currentChars > maxRange
    ? "bg-red-400"
    : "bg-yellow-500";

  const showTargetRange = targetChars !== undefined && targetChars !== maxChars;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-sm">
        <span className={cn(isOverLimit ? "text-red-500 font-medium" : inTargetRange ? "text-green-600 font-medium" : "text-yellow-600 font-medium")}>
          {currentChars.toLocaleString()} 文字
          {showTargetRange
            ? ` / 目標 ${target.toLocaleString()}（${minRange}〜${maxRange}）`
            : ` / ${maxChars.toLocaleString()}`}
          {isOverLimit && ` (+${(currentChars - maxChars).toLocaleString()})`}
        </span>
        <span className="text-muted-foreground">{modeLabel}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", barColor)}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {isOverLimit && (
        <p className="text-xs text-red-500">{overLimitMessage}</p>
      )}
      {!isOverLimit && !inTargetRange && currentChars > 0 && (
        <p className="text-xs text-yellow-600">
          {currentChars < minRange
            ? `目標より少なめです（${minRange - currentChars}文字不足）`
            : `目標より多めです（${currentChars - maxRange}文字超過）`}
        </p>
      )}
    </div>
  );
}

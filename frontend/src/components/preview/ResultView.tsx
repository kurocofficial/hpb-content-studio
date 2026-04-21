import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import CopyButton from "./CopyButton";
import CharCounter from "./CharCounter";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw } from "lucide-react";

interface ResultViewProps {
  content: string;
  maxChars: number;
  charCountMode?: "hpb" | "standard";
  targetChars?: number;
  contentId?: string | null;
  isGenerating?: boolean;
  isRetrying?: boolean;
  onEdit?: (content: string) => void;
  onChatModify?: () => void;
  onRegenerate?: () => void;
}

export default function ResultView({
  content,
  maxChars,
  charCountMode = "hpb",
  targetChars,
  contentId,
  isGenerating = false,
  isRetrying = false,
  onEdit,
  onChatModify,
  onRegenerate,
}: ResultViewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">生成結果</CardTitle>
          <div className="flex items-center space-x-2">
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                再生成
              </Button>
            )}
            {onChatModify && contentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChatModify}
                disabled={isGenerating || !content}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                チャットで修正
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Editable textarea */}
        <Textarea
          value={content}
          onChange={(e) => onEdit?.(e.target.value)}
          placeholder={
            isRetrying
              ? "文字数を調整中..."
              : isGenerating
              ? "生成中..."
              : "生成されたテキストがここに表示されます"
          }
          className="min-h-[500px] resize-y text-sm leading-relaxed"
          readOnly={isGenerating}
        />

        {/* リトライ中インジケーター */}
        {isRetrying && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            文字数が目標範囲外のため、自動調整中...
          </p>
        )}

        {/* Character counter */}
        {content && (
          <CharCounter text={content} maxChars={maxChars} charCountMode={charCountMode} targetChars={targetChars} />
        )}

        {/* Copy button */}
        <div className="flex justify-end">
          <CopyButton
            text={content}
            className="w-full sm:w-auto"
          />
        </div>
      </CardContent>
    </Card>
  );
}

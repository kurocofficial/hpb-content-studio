import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import CopyButton from "@/components/preview/CopyButton";
import CharCounter from "@/components/preview/CharCounter";
import {
  ArrowLeft,
  Send,
  User,
  Bot,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatHistory {
  session: {
    id: string;
    content_id: string;
    turn_count: number;
  };
  messages: ChatMessage[];
  current_content: string;
  can_continue: boolean;
  turns_remaining: number | null;
}

export default function ChatPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentContent, setCurrentContent] = useState("");
  const [contentType, setContentType] = useState("");
  const [maxChars, setMaxChars] = useState(500);
  const [canContinue, setCanContinue] = useState(true);
  const [turnsRemaining, setTurnsRemaining] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const contentTypeMaxChars: Record<string, number> = {
    salon_catch: 45,
    salon_intro: 500,
    stylist_profile: 200,
    blog_article: 10000,
    review_reply: 500,
    consultation: 2000,
    google_review_reply: 500,
  };

  useEffect(() => {
    if (contentId) {
      initializeChat();
    }
  }, [contentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);

      // コンテンツ情報を取得
      const content = await api.get<any>(`/api/v1/contents/${contentId}`);
      setCurrentContent(content.content);
      setContentType(content.content_type);
      setMaxChars(contentTypeMaxChars[content.content_type] || 500);

      // セッションを作成または取得
      const session = await api.post<any>("/api/v1/chat/sessions", {
        content_id: contentId,
      });
      setSessionId(session.id);

      // 履歴を取得
      const history = await api.get<ChatHistory>(
        `/api/v1/chat/sessions/${session.id}`
      );
      setMessages(history.messages);
      setCurrentContent(history.current_content);
      setCanContinue(history.can_continue);
      setTurnsRemaining(history.turns_remaining);
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "チャットの初期化に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    // 楽観的UI更新
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await api.post<ChatMessage>(
        `/api/v1/chat/sessions/${sessionId}/messages`,
        { message: userMessage }
      );

      // AI応答を追加
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        { ...tempUserMessage, id: `user-${Date.now()}` },
        response,
      ]);

      // コンテンツを更新
      setCurrentContent(response.content);

      // ターン情報を更新
      if (turnsRemaining !== null) {
        const newRemaining = turnsRemaining - 1;
        setTurnsRemaining(newRemaining);
        setCanContinue(newRemaining > 0);
      }
    } catch (error: any) {
      // エラー時は楽観的更新を取り消す
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      toast({
        title: "エラー",
        description: error.message || "メッセージの送信に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId) return;

    try {
      await api.post(`/api/v1/chat/sessions/${sessionId}/confirm`);
      toast({
        title: "確定完了",
        description: "コンテンツを確定しました",
        variant: "success",
      });
      navigate("/history");
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "確定に失敗しました",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/generate")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <h1 className="text-xl font-bold">チャットで修正</h1>
          </div>
          <div className="flex items-center space-x-2">
            {turnsRemaining !== null && (
              <span className="text-sm text-muted-foreground">
                残り{turnsRemaining}回
              </span>
            )}
            <Button onClick={handleConfirm}>
              <Check className="h-4 w-4 mr-2" />
              この内容で確定
            </Button>
          </div>
        </div>

        {/* Main content - Split view */}
        <div className="grid lg:grid-cols-2 gap-4 h-[calc(100%-4rem)]">
          {/* Left: Chat */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">修正チャット</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      修正したい内容を指示してください
                      <br />
                      <span className="text-sm">
                        例: 「もっとカジュアルな表現にして」
                      </span>
                    </div>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-start space-x-3",
                        message.role === "user" && "flex-row-reverse space-x-reverse"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "flex-1 rounded-lg p-3 max-w-[80%]",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              {!canContinue ? (
                <div className="flex items-center justify-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm">
                    チャット回数上限に達しました。Proプランにアップグレードすると無制限で利用できます。
                  </span>
                </div>
              ) : (
                <div className="flex space-x-2 pt-4 border-t">
                  <Textarea
                    placeholder="修正指示を入力..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[60px] resize-none"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSending}
                    className="h-auto"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Preview */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">プレビュー</CardTitle>
                <CopyButton text={currentContent} />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {currentContent || "コンテンツがありません"}
                </div>
              </ScrollArea>
              <div className="pt-4 border-t">
                <CharCounter
                  text={currentContent}
                  maxChars={maxChars}
                  charCountMode={contentType === "google_review_reply" ? "standard" : "hpb"}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

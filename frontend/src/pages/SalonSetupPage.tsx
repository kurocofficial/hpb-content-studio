import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSalonStore } from "@/stores/salonStore";
import { useAuthStore } from "@/stores/authStore";
import { SalonRule } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import { ArrowLeft, Store, Plus, X, Crown, Lock } from "lucide-react";

const RULE_TAG_PRESETS = ["NGワード", "必須ワード", "トンマナ", "ブランドガイド", "その他"];

export default function SalonSetupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { salon, isLoading, fetchSalon, createSalon, updateSalon } =
    useSalonStore();
  const { plan } = useAuthStore();
  const isPremium = plan === "pro" || plan === "team";

  const [formData, setFormData] = useState({
    name: "",
    area: "",
    concept: "",
    target_customer: "",
    strength: "",
  });
  const [rules, setRules] = useState<SalonRule[]>([]);
  const [newRuleTag, setNewRuleTag] = useState<string>("NGワード");
  const [newRuleTagCustom, setNewRuleTagCustom] = useState("");
  const [newRuleValue, setNewRuleValue] = useState("");

  const isEditing = !!salon;

  useEffect(() => {
    fetchSalon();
  }, [fetchSalon]);

  useEffect(() => {
    if (salon) {
      setFormData({
        name: salon.name || "",
        area: salon.area || "",
        concept: salon.concept || "",
        target_customer: salon.target_customer || "",
        strength: salon.strength || "",
      });
      setRules(salon.rules || []);
    }
  }, [salon]);

  const handleAddRule = () => {
    if (!isPremium) return;
    const tag = newRuleTag === "その他" ? newRuleTagCustom.trim() : newRuleTag;
    if (!tag || !newRuleValue.trim()) return;
    setRules([...rules, { tag, value: newRuleValue.trim() }]);
    setNewRuleValue("");
    if (newRuleTag === "その他") setNewRuleTagCustom("");
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.area.trim()) {
      toast({
        title: "入力エラー",
        description: "サロン名とエリアは必須です",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...formData,
      rules: isPremium && rules.length > 0 ? rules : undefined,
    };

    try {
      if (isEditing) {
        await updateSalon(payload);
        toast({
          title: "更新完了",
          description: "サロン情報を更新しました",
          variant: "success",
        });
      } else {
        await createSalon(payload);
        toast({
          title: "登録完了",
          description: "サロン情報を登録しました",
          variant: "success",
        });
      }
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "保存に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "サロン情報を編集" : "サロン情報を登録"}
          </h1>
          <p className="text-muted-foreground mt-1">
            サロンの情報を入力すると、より個性的なコンテンツを生成できます
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2 text-primary" />
              基本情報
            </CardTitle>
            <CardDescription>
              必須項目を入力してください。任意項目はコンテンツ生成の精度向上に役立ちます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    サロン名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="例: HAIR SALON BLOOM"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">
                    エリア <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="area"
                    placeholder="例: 渋谷・表参道"
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="concept">サロンコンセプト（任意）</Label>
                <Textarea
                  id="concept"
                  placeholder="例: 「あなたらしさ」を引き出す、パーソナルサロン"
                  value={formData.concept}
                  onChange={(e) =>
                    setFormData({ ...formData, concept: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_customer">ターゲット層（任意）</Label>
                <Input
                  id="target_customer"
                  placeholder="例: 20代〜40代の働く女性"
                  value={formData.target_customer}
                  onChange={(e) =>
                    setFormData({ ...formData, target_customer: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="strength">強み・特徴（任意）</Label>
                <Textarea
                  id="strength"
                  placeholder="例: 髪質改善に特化したトリートメント、完全個室でリラックスできる空間"
                  value={formData.strength}
                  onChange={(e) =>
                    setFormData({ ...formData, strength: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {/* 店舗ルール（Pro/Team限定） */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="flex items-center gap-1.5">
                    🏷️ 店舗ルール（生成ガイドライン）
                    {!isPremium ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        <Crown className="h-3 w-3" /> Pro
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-normal">任意</span>
                    )}
                  </Label>
                </div>

                {!isPremium ? (
                  <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-4 flex items-center gap-3 text-sm text-amber-800">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>NGワード・必須ワード・トンマナなどを登録し、AIに自動反映。Proプラン限定機能です。</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      登録したルールはAIの生成プロンプトに自動的に反映されます
                    </p>

                    {/* 既存ルール一覧 */}
                    {rules.length > 0 && (
                      <div className="space-y-2">
                        {rules.map((rule, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-sm"
                          >
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium whitespace-nowrap">
                              {rule.tag}
                            </span>
                            <span className="flex-1 text-foreground">{rule.value}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(i)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 新規ルール追加 */}
                    <div className="flex gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">タグ</Label>
                        <Select value={newRuleTag} onValueChange={setNewRuleTag}>
                          <SelectTrigger className="w-36 h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TAG_PRESETS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {newRuleTag === "その他" && (
                        <div className="space-y-1">
                          <Label className="text-xs">タグ名</Label>
                          <Input
                            className="h-9 text-sm w-28"
                            placeholder="例: 絵文字NG"
                            value={newRuleTagCustom}
                            onChange={(e) => setNewRuleTagCustom(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">内容</Label>
                        <Input
                          className="h-9 text-sm"
                          placeholder={
                            newRuleTag === "NGワード" ? "例: 最安値、激安" :
                            newRuleTag === "必須ワード" ? "例: 似合わせ、再現性" :
                            newRuleTag === "トンマナ" ? "例: 丁寧でやわらかい表現で" :
                            "内容を入力"
                          }
                          value={newRuleValue}
                          onChange={(e) => setNewRuleValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRule())}
                        />
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 px-3"
                        onClick={handleAddRule}
                        disabled={!newRuleValue.trim() || (newRuleTag === "その他" && !newRuleTagCustom.trim())}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "保存中..."
                    : isEditing
                    ? "更新する"
                    : "登録する"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

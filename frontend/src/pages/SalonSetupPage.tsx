import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSalonStore } from "@/stores/salonStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import { ArrowLeft, Store } from "lucide-react";

export default function SalonSetupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { salon, isLoading, fetchSalon, createSalon, updateSalon } =
    useSalonStore();

  const [formData, setFormData] = useState({
    name: "",
    area: "",
    concept: "",
    target_customer: "",
    strength: "",
  });

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
    }
  }, [salon]);

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

    try {
      if (isEditing) {
        await updateSalon(formData);
        toast({
          title: "更新完了",
          description: "サロン情報を更新しました",
          variant: "success",
        });
      } else {
        await createSalon(formData);
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

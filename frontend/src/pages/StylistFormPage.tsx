import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStylistStore } from "@/stores/stylistStore";
import { WritingStyle } from "@/types";
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
import { ArrowLeft, User, X, Plus } from "lucide-react";

export default function StylistFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const {
    selectedStylist,
    isLoading,
    fetchStylist,
    createStylist,
    updateStylist,
  } = useStylistStore();

  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    years_experience: "",
    specialties: [] as string[],
    style_features: [] as string[],
    personality: "",
    writing_style: {
      tone: "friendly",
      emoji_usage: "minimal",
      sentence_style: "medium",
    } as WritingStyle,
  });

  const [newSpecialty, setNewSpecialty] = useState("");
  const [newStyleFeature, setNewStyleFeature] = useState("");

  useEffect(() => {
    if (id) {
      fetchStylist(id);
    }
  }, [id, fetchStylist]);

  useEffect(() => {
    if (isEditing && selectedStylist) {
      setFormData({
        name: selectedStylist.name || "",
        role: selectedStylist.role || "",
        years_experience: selectedStylist.years_experience?.toString() || "",
        specialties: selectedStylist.specialties || [],
        style_features: selectedStylist.style_features || [],
        personality: selectedStylist.personality || "",
        writing_style: selectedStylist.writing_style || {
          tone: "friendly",
          emoji_usage: "minimal",
          sentence_style: "medium",
        },
      });
    }
  }, [isEditing, selectedStylist]);

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, newSpecialty.trim()],
      });
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (index: number) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index),
    });
  };

  const handleAddStyleFeature = () => {
    if (
      newStyleFeature.trim() &&
      !formData.style_features.includes(newStyleFeature.trim())
    ) {
      setFormData({
        ...formData,
        style_features: [...formData.style_features, newStyleFeature.trim()],
      });
      setNewStyleFeature("");
    }
  };

  const handleRemoveStyleFeature = (index: number) => {
    setFormData({
      ...formData,
      style_features: formData.style_features.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "入力エラー",
        description: "スタイリスト名は必須です",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      name: formData.name,
      role: formData.role || undefined,
      years_experience: formData.years_experience
        ? parseInt(formData.years_experience)
        : undefined,
      specialties: formData.specialties,
      style_features: formData.style_features,
      personality: formData.personality || undefined,
      writing_style: formData.writing_style,
    };

    try {
      if (isEditing && id) {
        await updateStylist(id, submitData);
        toast({
          title: "更新完了",
          description: "スタイリスト情報を更新しました",
          variant: "success",
        });
      } else {
        await createStylist(submitData);
        toast({
          title: "登録完了",
          description: "スタイリストを登録しました",
          variant: "success",
        });
      }
      navigate("/stylists");
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
            onClick={() => navigate("/stylists")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "スタイリストを編集" : "スタイリストを追加"}
          </h1>
          <p className="text-muted-foreground mt-1">
            スタイリストの情報を入力すると、個性に合わせたコンテンツを生成できます
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    スタイリスト名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="例: 田中 花子"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">役職（任意）</Label>
                  <Input
                    id="role"
                    placeholder="例: 店長、トップスタイリスト"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="years_experience">経験年数（任意）</Label>
                <Input
                  id="years_experience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="例: 10"
                  value={formData.years_experience}
                  onChange={(e) =>
                    setFormData({ ...formData, years_experience: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardHeader>
              <CardTitle>得意メニュー</CardTitle>
              <CardDescription>
                カット、カラー、パーマなど得意なメニューを追加
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="例: ハイライトカラー"
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSpecialty();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddSpecialty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialty(index)}
                      className="ml-2 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Style features */}
          <Card>
            <CardHeader>
              <CardTitle>得意スタイル・こだわり</CardTitle>
              <CardDescription>
                得意なスタイルやこだわりポイントを追加
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="例: ナチュラルボブ、透明感カラー"
                  value={newStyleFeature}
                  onChange={(e) => setNewStyleFeature(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddStyleFeature();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddStyleFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.style_features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => handleRemoveStyleFeature(index)}
                      className="ml-2 hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personality */}
          <Card>
            <CardHeader>
              <CardTitle>性格・人柄（任意）</CardTitle>
              <CardDescription>
                スタイリストの性格や接客スタイルを記載
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="例: 明るく話しやすい性格で、お客様との会話を大切にしています。丁寧なカウンセリングで、理想のスタイルを一緒に見つけます。"
                value={formData.personality}
                onChange={(e) =>
                  setFormData({ ...formData, personality: e.target.value })
                }
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Writing style */}
          <Card>
            <CardHeader>
              <CardTitle>文体の好み</CardTitle>
              <CardDescription>
                生成されるテキストの雰囲気を設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>トーン</Label>
                  <Select
                    value={formData.writing_style.tone}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        writing_style: {
                          ...formData.writing_style,
                          tone: value as WritingStyle["tone"],
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">カジュアル</SelectItem>
                      <SelectItem value="friendly">フレンドリー</SelectItem>
                      <SelectItem value="professional">プロフェッショナル</SelectItem>
                      <SelectItem value="formal">フォーマル</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>絵文字の使用</Label>
                  <Select
                    value={formData.writing_style.emoji_usage}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        writing_style: {
                          ...formData.writing_style,
                          emoji_usage: value as WritingStyle["emoji_usage"],
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">使用しない</SelectItem>
                      <SelectItem value="minimal">控えめ</SelectItem>
                      <SelectItem value="moderate">適度</SelectItem>
                      <SelectItem value="frequent">多め</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>文の長さ</Label>
                  <Select
                    value={formData.writing_style.sentence_style}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        writing_style: {
                          ...formData.writing_style,
                          sentence_style: value as WritingStyle["sentence_style"],
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">短め</SelectItem>
                      <SelectItem value="medium">標準</SelectItem>
                      <SelectItem value="long">長め</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/stylists")}
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
      </div>
    </MainLayout>
  );
}

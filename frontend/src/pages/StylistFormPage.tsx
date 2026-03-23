import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStylistStore } from "@/stores/stylistStore";
import { WritingStyle, LanguageStyle, Background, ServiceInfo } from "@/types";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import { ArrowLeft, User, X, Plus, ChevronDown, ChevronRight, MessageSquare, Heart, Handshake } from "lucide-react";

const EMPTY_LANGUAGE_STYLE: LanguageStyle = {
  dialect: null,
  first_person: null,
  customer_call: null,
  catchphrase: null,
};

const EMPTY_BACKGROUND: Background = {
  hobbies: null,
  motivation: null,
  motto: null,
  fashion_style: null,
};

const EMPTY_SERVICE_INFO: ServiceInfo = {
  target_demographic: null,
  service_style: null,
  counseling_approach: null,
};

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
    language_style: { ...EMPTY_LANGUAGE_STYLE } as LanguageStyle,
    background: { ...EMPTY_BACKGROUND } as Background,
    service_info: { ...EMPTY_SERVICE_INFO } as ServiceInfo,
  });

  const [newSpecialty, setNewSpecialty] = useState("");
  const [newStyleFeature, setNewStyleFeature] = useState("");
  const [openSections, setOpenSections] = useState({
    language: false,
    background: false,
    service: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (id) {
      fetchStylist(id);
    }
  }, [id, fetchStylist]);

  useEffect(() => {
    if (isEditing && selectedStylist) {
      const hasLanguage = selectedStylist.language_style && Object.values(selectedStylist.language_style).some(v => v != null);
      const hasBackground = selectedStylist.background && Object.values(selectedStylist.background).some(v => v != null);
      const hasService = selectedStylist.service_info && Object.values(selectedStylist.service_info).some(v => v != null);

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
        language_style: selectedStylist.language_style || { ...EMPTY_LANGUAGE_STYLE },
        background: selectedStylist.background || { ...EMPTY_BACKGROUND },
        service_info: selectedStylist.service_info || { ...EMPTY_SERVICE_INFO },
      });

      // 既存データがあるセクションは開いておく
      setOpenSections({
        language: !!hasLanguage,
        background: !!hasBackground,
        service: !!hasService,
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

  const serializeOptionalJson = <T,>(obj: T): T | undefined => {
    const entries = Object.entries(obj as Record<string, unknown>);
    const hasValue = entries.some(([, v]) => v != null && v !== "");
    if (!hasValue) return undefined;
    return Object.fromEntries(
      entries.map(([k, v]) => [k, v === "" ? null : v])
    ) as T;
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
      language_style: serializeOptionalJson(formData.language_style),
      background: serializeOptionalJson(formData.background),
      service_info: serializeOptionalJson(formData.service_info),
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

          {/* === 詳細設定（折りたたみセクション） === */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">
              詳細設定（任意） — より個性的なコンテンツ生成のために
            </p>

            {/* Language Style */}
            <Collapsible open={openSections.language} onOpenChange={() => toggleSection("language")}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-purple-500" />
                        言葉づかい
                      </span>
                      {openSections.language ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription>方言・一人称・呼び方・口癖の設定</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>方言</Label>
                        <Select
                          value={formData.language_style.dialect || "__none__"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              language_style: {
                                ...formData.language_style,
                                dialect: value === "__none__" ? null : value as LanguageStyle["dialect"],
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未設定</SelectItem>
                            <SelectItem value="標準語">標準語</SelectItem>
                            <SelectItem value="関西弁">関西弁</SelectItem>
                            <SelectItem value="博多弁">博多弁</SelectItem>
                            <SelectItem value="名古屋弁">名古屋弁</SelectItem>
                            <SelectItem value="東北弁">東北弁</SelectItem>
                            <SelectItem value="沖縄風">沖縄風</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>一人称</Label>
                        <Select
                          value={formData.language_style.first_person || "__none__"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              language_style: {
                                ...formData.language_style,
                                first_person: value === "__none__" ? null : value as LanguageStyle["first_person"],
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未設定</SelectItem>
                            <SelectItem value="私">私</SelectItem>
                            <SelectItem value="わたし">わたし</SelectItem>
                            <SelectItem value="僕">僕</SelectItem>
                            <SelectItem value="あたし">あたし</SelectItem>
                            <SelectItem value="自分">自分</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>お客様の呼び方</Label>
                        <Select
                          value={formData.language_style.customer_call || "__none__"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              language_style: {
                                ...formData.language_style,
                                customer_call: value === "__none__" ? null : value as LanguageStyle["customer_call"],
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未設定</SelectItem>
                            <SelectItem value="お客様">お客様</SelectItem>
                            <SelectItem value="ゲスト様">ゲスト様</SelectItem>
                            <SelectItem value="お客さん">お客さん</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="catchphrase">口癖（任意・最大100文字）</Label>
                      <Input
                        id="catchphrase"
                        placeholder='例: 「〜なんですよね！」「めっちゃ〜」'
                        maxLength={100}
                        value={formData.language_style.catchphrase || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            language_style: {
                              ...formData.language_style,
                              catchphrase: e.target.value || null,
                            },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Background */}
            <Collapsible open={openSections.background} onOpenChange={() => toggleSection("background")}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Heart className="h-5 w-5 mr-2 text-pink-500" />
                        バックグラウンド
                      </span>
                      {openSections.background ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription>趣味・動機・座右の銘・ファッションスタイル</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="hobbies">趣味（最大200文字）</Label>
                        <Input
                          id="hobbies"
                          placeholder="例: カフェ巡り、フェス、料理"
                          maxLength={200}
                          value={formData.background.hobbies || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              background: {
                                ...formData.background,
                                hobbies: e.target.value || null,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fashion_style">好きなファッション（最大100文字）</Label>
                        <Input
                          id="fashion_style"
                          placeholder="例: ストリート, モード, ナチュラル, 韓国系"
                          maxLength={100}
                          value={formData.background.fashion_style || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              background: {
                                ...formData.background,
                                fashion_style: e.target.value || null,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motivation">美容師になった理由（最大300文字）</Label>
                      <Textarea
                        id="motivation"
                        placeholder="例: 母が美容師で、小さい頃から憧れていました。人を笑顔にできるこの仕事が大好きです。"
                        maxLength={300}
                        rows={2}
                        value={formData.background.motivation || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            background: {
                              ...formData.background,
                              motivation: e.target.value || null,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motto">座右の銘（最大100文字）</Label>
                      <Input
                        id="motto"
                        placeholder="例: 「一人一人に寄り添うスタイルを」"
                        maxLength={100}
                        value={formData.background.motto || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            background: {
                              ...formData.background,
                              motto: e.target.value || null,
                            },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Service Info */}
            <Collapsible open={openSections.service} onOpenChange={() => toggleSection("service")}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Handshake className="h-5 w-5 mr-2 text-amber-500" />
                        接客スタイル
                      </span>
                      {openSections.service ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription>ターゲット客層・接客タイプ・カウンセリング</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="target_demographic">得意な客層（最大200文字）</Label>
                        <Input
                          id="target_demographic"
                          placeholder="例: 20代OL、ママ世代、メンズ"
                          maxLength={200}
                          value={formData.service_info.target_demographic || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              service_info: {
                                ...formData.service_info,
                                target_demographic: e.target.value || null,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>接客スタイル</Label>
                        <Select
                          value={formData.service_info.service_style || "__none__"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              service_info: {
                                ...formData.service_info,
                                service_style: value === "__none__" ? null : value as ServiceInfo["service_style"],
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未設定</SelectItem>
                            <SelectItem value="おしゃべり好き">おしゃべり好き</SelectItem>
                            <SelectItem value="落ち着いた空間重視">落ち着いた空間重視</SelectItem>
                            <SelectItem value="提案型">提案型</SelectItem>
                            <SelectItem value="お任せ歓迎型">お任せ歓迎型</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="counseling_approach">カウンセリングの特徴（最大300文字）</Label>
                      <Textarea
                        id="counseling_approach"
                        placeholder="例: 写真や雑誌を使いながら、お客様の理想のイメージを丁寧にヒアリングします。髪質やライフスタイルも考慮して、再現性の高いスタイルを提案します。"
                        maxLength={300}
                        rows={2}
                        value={formData.service_info.counseling_approach || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            service_info: {
                              ...formData.service_info,
                              counseling_approach: e.target.value || null,
                            },
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

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

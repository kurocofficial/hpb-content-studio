import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStylistStore } from "@/stores/stylistStore";
import { useSalonStore } from "@/stores/salonStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import MainLayout from "@/components/layout/MainLayout";
import { Plus, User, Edit, Trash2, AlertCircle } from "lucide-react";

export default function StylistListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stylists, isLoading, fetchStylists, deleteStylist } =
    useStylistStore();
  const { salon, fetchSalon } = useSalonStore();

  useEffect(() => {
    fetchSalon();
    fetchStylists();
  }, [fetchSalon, fetchStylists]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deleteStylist(id);
      toast({
        title: "削除完了",
        description: `${name}を削除しました`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  // サロン未登録の場合
  if (!salon) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                まずサロン情報を登録してください
              </h2>
              <p className="text-muted-foreground mb-4">
                スタイリストを登録するには、先にサロン情報の登録が必要です
              </p>
              <Button onClick={() => navigate("/salon/setup")}>
                サロン情報を登録
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">スタイリスト管理</h1>
            <p className="text-muted-foreground mt-1">
              {salon.name} のスタイリスト一覧
            </p>
          </div>
          <Button onClick={() => navigate("/stylists/new")}>
            <Plus className="h-4 w-4 mr-2" />
            スタイリストを追加
          </Button>
        </div>

        {/* Stylist list */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">読み込み中...</p>
          </div>
        ) : stylists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                スタイリストが登録されていません
              </h2>
              <p className="text-muted-foreground mb-4">
                スタイリストを登録して、個性に合わせたコンテンツを生成しましょう
              </p>
              <Button onClick={() => navigate("/stylists/new")}>
                <Plus className="h-4 w-4 mr-2" />
                最初のスタイリストを追加
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {stylists.map((stylist) => (
              <Card key={stylist.id} className="hpb-card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{stylist.name}</CardTitle>
                        <CardDescription>
                          {stylist.role || "スタイリスト"}
                          {stylist.years_experience &&
                            ` / 経験${stylist.years_experience}年`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/stylists/${stylist.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(stylist.id, stylist.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stylist.specialties?.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                    {stylist.style_features?.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  {stylist.personality && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {stylist.personality}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

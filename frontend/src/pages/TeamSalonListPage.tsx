import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Store,
  Users,
  Plus,
  ArrowRight,
  Upload,
  Building2,
} from "lucide-react";

export default function TeamSalonListPage() {
  const navigate = useNavigate();
  const { organization, orgSalons, fetchOrgSalons } = useOrganizationStore();
  const { plan } = useAuthStore();

  useEffect(() => {
    if (organization) {
      fetchOrgSalons();
    }
  }, [organization, fetchOrgSalons]);

  if (plan !== "team") {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">マルチサロン管理</h1>
          <p className="text-muted-foreground">
            この機能はTeamプラン専用です。
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">サロン一覧</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {organization?.name} - {orgSalons.length}店舗
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/team/import")}
            >
              <Upload className="h-4 w-4 mr-2" />
              CSV一括登録
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `/salon/setup?organization_id=${organization?.id}`
                )
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              サロン追加
            </Button>
          </div>
        </div>

        {orgSalons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                まだサロンが登録されていません
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                サロンを個別に追加するか、CSV一括登録をお試しください
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate("/team/import")}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  CSV一括登録
                </Button>
                <Button
                  onClick={() =>
                    navigate(
                      `/salon/setup?organization_id=${organization?.id}`
                    )
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  サロン追加
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgSalons.map((salon) => (
              <Card
                key={salon.id}
                className="hpb-card-hover cursor-pointer"
                onClick={() =>
                  navigate(`/salon/setup?salon_id=${salon.id}`)
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base mt-2">
                    {salon.name}
                  </CardTitle>
                  <CardDescription>{salon.area}</CardDescription>
                </CardHeader>
                <CardContent>
                  {salon.concept && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {salon.concept}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      スタイリスト管理
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

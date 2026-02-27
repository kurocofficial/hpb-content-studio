import { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/useToast";
import {
  UserCog,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";

export default function OrgMembersPage() {
  const { organization, members, fetchMembers, addMember, removeMember } =
    useOrganizationStore();
  const { plan, orgRole } = useAuthStore();
  const { toast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "member">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (organization) {
      fetchMembers();
    }
  }, [organization, fetchMembers]);

  const isAdmin = orgRole === "owner" || orgRole === "admin";

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await addMember(newEmail.trim(), newRole);
      toast({
        title: "メンバーを追加しました",
        variant: "success",
      });
      setNewEmail("");
      setNewRole("member");
      setShowAddForm(false);
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("このメンバーを削除しますか？")) return;

    try {
      await removeMember(userId);
      toast({
        title: "メンバーを削除しました",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <ShieldCheck className="h-4 w-4 text-yellow-600" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "オーナー";
      case "admin":
        return "管理者";
      default:
        return "メンバー";
    }
  };

  if (plan !== "team") {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <UserCog className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">メンバー管理</h1>
          <p className="text-muted-foreground">
            この機能はTeamプラン専用です。
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">メンバー管理</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {organization?.name} - {members.length}名
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <UserPlus className="h-4 w-4 mr-2" />
              メンバー追加
            </Button>
          )}
        </div>

        {/* メンバー追加フォーム */}
        {showAddForm && isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">メンバー追加</CardTitle>
              <CardDescription>
                登録済みユーザーのメールアドレスを入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ロール
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) =>
                      setNewRole(e.target.value as "admin" | "member")
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="member">
                      メンバー（コンテンツ生成のみ）
                    </option>
                    <option value="admin">
                      管理者（CSV登録・サロン管理可能）
                    </option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "追加中..." : "追加"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* メンバー一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">メンバー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      {getRoleIcon(member.role)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.email || member.user_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRoleLabel(member.role)} /{" "}
                        {new Date(member.created_at).toLocaleDateString(
                          "ja-JP"
                        )}
                      </p>
                    </div>
                  </div>
                  {isAdmin && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import {
  LayoutDashboard,
  Users,
  PenLine,
  History,
  Settings,
  LogOut,
  Menu,
  Store,
  Upload,
  UserCog,
  CreditCard,
  ExternalLink,
  Zap,
  Calendar,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import SalonSelector from "@/components/team/SalonSelector";

interface MainLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { name: "スタイリスト", href: "/stylists", icon: Users },
  { name: "コンテンツ生成", href: "/generate", icon: PenLine },
  { name: "履歴", href: "/history", icon: History },
  { name: "プラン・お問い合わせ", href: "/billing", icon: CreditCard },
];

const proNavigation = [
  { name: "一括生成", href: "/batch-generate", icon: Zap },
  { name: "カレンダー", href: "/calendar", icon: Calendar },
];

const teamNavigation = [
  { name: "サロン一覧", href: "/team/salons", icon: Store },
  { name: "CSV一括登録", href: "/team/import", icon: Upload },
  { name: "メンバー管理", href: "/team/members", icon: UserCog },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, plan, signOut } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "ログアウトしました",
        variant: "success",
      });
      navigate("/login");
    } catch {
      toast({
        title: "エラー",
        description: "ログアウトに失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="hpb-gradient text-white font-bold text-lg px-3 py-1 rounded-lg">
                HPB
              </div>
              <span className="font-semibold text-foreground">
                Content Studio
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Pro Navigation（Pro/Team or 開発環境で表示） */}
            {(plan === "pro" || plan === "team" || import.meta.env.DEV) && (
              <>
                <div className="pt-4 pb-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Pro
                  </p>
                </div>
                {proNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </>
            )}

            {/* Free ユーザー向けアップセルリンク */}
            {plan === "free" && !import.meta.env.DEV && (
              <div className="pt-4">
                <Link
                  to="/billing"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Crown className="h-5 w-5" />
                  <span className="text-sm">Proにアップグレード</span>
                </Link>
              </div>
            )}

            {/* Team Navigation（開発環境ではプラン不問で表示） */}
            {(plan === "team" || import.meta.env.DEV) && (
              <>
                <div className="pt-4 pb-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Team
                  </p>
                </div>
                {teamNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <SalonSelector />
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {plan === "team" ? "Teamプラン" : plan === "pro" ? "Proプラン" : "Freeプラン"}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigate("/settings");
                  setSidebarOpen(false);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                設定
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <a
              href="https://hpb-content-studio.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 mt-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              <span>サービスページ</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hpb-gradient text-white font-bold text-sm px-2 py-1 rounded">
            HPB Content Studio
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

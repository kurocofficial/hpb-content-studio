import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  Copy,
  MessageSquare,
  FileText,
  User,
  ChevronDown,
  ArrowRight,
  Hash,
  Menu,
  X,
  Check,
  Zap,
  PenLine,
  BookOpen,
  MousePointerClick,
  HelpCircle,
  Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────
interface StatsData {
  weekly_signups: number;
  total_tokens: number;
  registered_salons: number;
  last_updated: string;
}

// ─── Scroll Reveal Hook ───────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    ref.current.querySelectorAll(".sr").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return ref;
}

// ─── Count Up Hook ────────────────────────────────────
function useCountUp(target: number, duration: number, start: boolean) {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!start || hasAnimated.current || target === 0) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    function easeOutExpo(t: number) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutExpo(progress) * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration, start]);

  return value;
}

// ─── Stats Helpers ────────────────────────────────────
function formatTokens(value: number): number {
  return Math.round(value / 10000);
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parts[0]}年${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
}

// ─── Stats Bar Component ──────────────────────────────
function StatsBar() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    fetch(`${backendUrl}/api/v1/public/stats`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: StatsData) => setStats(data))
      .catch(() => {
        // APIが使えない場合は静的JSONにフォールバック
        fetch("/stats.json")
          .then((res) => res.json())
          .then((data: StatsData) => setStats(data))
          .catch(() => {});
      });
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [stats]);

  const signups = useCountUp(stats?.weekly_signups ?? 0, 2000, visible);
  const tokens = useCountUp(formatTokens(stats?.total_tokens ?? 0), 2000, visible);
  const salons = useCountUp(stats?.registered_salons ?? 0, 2000, visible);

  if (!stats) return null;

  const items = [
    { emoji: "📈", value: signups, unit: "件", label: "今週の新規登録" },
    { emoji: "🤖", value: tokens, unit: "万", label: "累計AI処理トークン" },
    { emoji: "💈", value: salons, unit: "店舗", label: "登録サロン数" },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-gradient-to-br from-[#FFFBF7] to-[#FFF5EE] py-16"
    >
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {items.map((item, i) => (
            <div
              key={i}
              className={`sr sr-d${i + 1} flex flex-col items-center gap-1`}
            >
              <span className="text-2xl mb-1">{item.emoji}</span>
              <div>
                <span className="lp-serif text-[2.75rem] sm:text-[3.25rem] font-bold text-[#2C3E50] leading-none">
                  {item.value.toLocaleString()}
                </span>
                <span className="text-base font-medium text-[#2C3E50] ml-0.5">
                  {item.unit}
                </span>
              </div>
              <span className="text-sm text-[#6B7B8D] mt-1">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-center mt-6 text-xs text-[#6B7B8D]/60">
          最終更新: {formatDate(stats.last_updated)}
        </p>
      </div>
    </section>
  );
}

// ─── FAQ Accordion Item ───────────────────────────────
function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-[#EDE4DA]">
      <button
        className="w-full flex items-center justify-between py-6 text-left group cursor-pointer"
        onClick={onClick}
      >
        <span className="text-[17px] font-medium text-[#2C3E50] pr-4 group-hover:text-[#D4585A] transition-colors duration-300">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#D4585A] shrink-0 transition-transform duration-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-400 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-[#6B7B8D] leading-[1.9] text-[15px]">{answer}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Content Preview Card (Hero visual) ───────────────
function ContentPreviewCard() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative bg-white rounded-2xl shadow-[0_8px_40px_rgba(44,62,80,0.08)] border border-[#F0E6DC]/60 overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#FFF5F0] to-[#FFF0F5] border-b border-[#F0E6DC]/40">
        <div className="w-2 h-2 rounded-full bg-[#D4585A]" />
        <span className="text-xs font-semibold tracking-wide text-[#D4585A] uppercase">
          サロンキャッチコピー
        </span>
        <span className="ml-auto text-xs text-[#B0A090]">AI生成</span>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="lp-serif text-[17px] leading-[1.9] text-[#2C3E50] tracking-wide">
          透明感カラーとナチュラルケアで
          <br />
          あなただけの美しさを引き出す。
          <br />
          髪も心もふわっと軽くなるサロン
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#FDFBF9] border-t border-[#F0E6DC]/40">
        <div className="flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="text-sm text-[#10B981] font-medium">42 / 45文字</span>
        </div>
        <button
          className="flex items-center gap-1.5 text-sm text-[#D4585A] hover:text-[#B8484A] font-medium transition-colors cursor-pointer"
          onClick={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              コピー完了
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              コピー
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const containerRef = useScrollReveal();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load editorial serif font
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;500;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://fonts.googleapis.com";
    document.head.appendChild(preconnect);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(preconnect);
    };
  }, []);

  const painPoints = [
    {
      icon: Clock,
      title: "毎週のブログ更新が追いつかない",
      desc: "施術・接客・SNS...忙しい日々の中で、HPBの文章まで手が回らない。更新頻度が落ちて集客にも影響が出てしまう。",
    },
    {
      icon: User,
      title: "全員同じ文面になってしまう",
      desc: "スタイリストごとに個性を出したいのに、つい同じテンプレを使い回してしまう。お客様から見たら区別がつかない。",
    },
    {
      icon: PenLine,
      title: "そもそも文章を書くのが苦手",
      desc: "何を書けばいいか分からない。書き始めても時間がかかる。結局、無難な内容に落ち着いてしまう。",
    },
  ];

  const features = [
    {
      icon: Zap,
      type: "サロンキャッチコピー",
      limit: "45文字",
      desc: "検索結果で目を引く、サロンの第一印象を決めるキャッチコピー",
      color: "#D4585A",
      bg: "#FFF5F0",
    },
    {
      icon: FileText,
      type: "サロン紹介文",
      limit: "500文字",
      desc: "サロンのコンセプト・魅力・こだわりを温度感のある言葉で伝える",
      color: "#4ECDC4",
      bg: "#F0FFFE",
    },
    {
      icon: User,
      type: "スタイリストプロフィール",
      limit: "200文字",
      desc: "一人ひとりの個性・得意技・人柄が伝わる自己紹介文",
      color: "#D4585A",
      bg: "#FFF0F5",
    },
    {
      icon: BookOpen,
      type: "ブログ記事",
      limit: "10,000文字",
      desc: "トレンド・季節・施術ノウハウ、読み応えのある記事を量産",
      color: "#4ECDC4",
      bg: "#F0FFFE",
    },
    {
      icon: MessageSquare,
      type: "口コミ返信",
      limit: "500文字",
      desc: "お客様の口コミに対する返信文を作成",
      color: "#D4585A",
      bg: "#FFF5F0",
    },
    {
      icon: HelpCircle,
      type: "悩み相談",
      limit: "2,000文字",
      desc: "スタイリストの悩みにAIがアドバイス",
      color: "#D4585A",
      bg: "#FFF0F5",
    },
    {
      icon: Star,
      type: "Google口コミ返信",
      limit: "500文字",
      desc: "Googleマップの口コミに対する返信文を作成",
      color: "#4ECDC4",
      bg: "#F0FFFE",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "スタイリスト情報を登録",
      desc: "得意メニュー、スタイルの特徴、文体の好みを入力。この情報がAIの個性づけの源になります。",
      icon: User,
    },
    {
      num: "02",
      title: "コンテンツタイプを選んで生成",
      desc: "7種類のコンテンツタイプから選んでボタンを押すだけ。数秒で下書きが完成。",
      icon: Sparkles,
    },
    {
      num: "03",
      title: "コピーしてHPBに貼り付け",
      desc: "生成された文章を確認・編集して、ワンクリックでコピー。HPBの管理画面にそのまま貼り付け。",
      icon: MousePointerClick,
    },
  ];

  const faqs = [
    {
      q: "HPBの規約に違反しませんか？",
      a: "AIで生成したテキストの掲載に関する明確な禁止規定は現在ありません。ただし、HPB Content Studioでは生成した文章をそのまま使うのではなく、必ず人の目で確認・編集してから掲載することを強く推奨しています。あくまで「AI下書き→人が仕上げ」のワークフローです。",
    },
    {
      q: "スタイリストごとに文章のトーンは変わりますか？",
      a: "はい。登録時にスタイリストの得意メニュー・スタイルの特徴・文体の好み（カジュアル/丁寧/トレンド感など）を設定するので、同じサロンでもスタイリストごとに異なるトーンの文章が生成されます。",
    },
    {
      q: "無料プランでどこまで使えますか？",
      a: "テキスト・ブログ生成を合わせて月5回まで、スタイリスト3名まで登録、チャット修正は各セッション3往復まで無料でご利用いただけます。まずは気軽にお試しください。",
    },
    {
      q: "途中でプラン変更できますか？",
      a: "Proプランは現在準備中です。ご興味のある方はKUROCO株式会社（info@kuroco.team）までお問い合わせください。",
    },
    {
      q: "Teamプランとは？",
      a: "5店舗以上のサロンチェーンや、30名以上のスタイリストを抱える大規模グループ向けのプランです。複数サロンの一括管理、CSVによるスタイリスト一括登録、メンバー管理機能をご利用いただけます。料金は規模に応じて個別にご案内しますので、お気軽にお問い合わせください。",
    },
    {
      q: "生成された文章の著作権は？",
      a: "AIが生成した文章の著作権はお客様に帰属します。自由に編集・加工してHPBやSNS等でご利用いただけます。",
    },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div ref={containerRef} className="lp-root">
      {/* ─── Custom Styles ─── */}
      <style>{`
        .lp-root {
          --lp-coral: #D4585A;
          --lp-coral-light: #FF6B6B;
          --lp-teal: #4ECDC4;
          --lp-cream: #FFFBF7;
          --lp-cream-deep: #FFF5EE;
          --lp-dark: #2C3E50;
          --lp-muted: #6B7B8D;
          --lp-border: #EDE4DA;
        }

        .lp-serif {
          font-family: 'Shippori Mincho B1', 'Georgia', serif;
        }

        /* Scroll reveal */
        .sr {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sr.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .sr-d1 { transition-delay: 0.08s; }
        .sr-d2 { transition-delay: 0.16s; }
        .sr-d3 { transition-delay: 0.24s; }
        .sr-d4 { transition-delay: 0.32s; }

        /* Hero entrance */
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(36px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lp-hero-anim {
          animation: heroFadeUp 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        .lp-hero-anim-d1 { animation-delay: 0.15s; }
        .lp-hero-anim-d2 { animation-delay: 0.3s; }
        .lp-hero-anim-d3 { animation-delay: 0.45s; }
        .lp-hero-anim-d4 { animation-delay: 0.65s; }

        /* Floating blobs */
        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -25px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(0.95); }
          66% { transform: translate(15px, -30px) scale(1.08); }
        }
        .lp-blob-1 {
          animation: blobFloat1 12s ease-in-out infinite;
        }
        .lp-blob-2 {
          animation: blobFloat2 14s ease-in-out infinite;
        }
        .lp-blob-3 {
          animation: blobFloat1 16s ease-in-out infinite reverse;
        }

        /* Step connector line */
        .lp-step-line {
          background: linear-gradient(90deg, var(--lp-coral) 0%, var(--lp-teal) 100%);
          height: 2px;
          opacity: 0.3;
        }

        /* Feature card hover */
        .lp-feature-card {
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(44, 62, 80, 0.1);
        }

        /* Pricing card glow */
        .lp-pricing-pro {
          background: linear-gradient(135deg, #FFF5F0 0%, #FFF0F8 50%, #F0FFFE 100%);
          position: relative;
        }
        .lp-pricing-pro::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(135deg, var(--lp-coral) 0%, var(--lp-teal) 100%);
          border-radius: inherit;
          z-index: -1;
        }

        /* Gradient text */
        .lp-gradient-text {
          background: linear-gradient(135deg, var(--lp-coral) 0%, var(--lp-teal) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* CTA section gradient */
        .lp-cta-gradient {
          background: linear-gradient(135deg, #2C3E50 0%, #34495E 50%, #2C3E50 100%);
          position: relative;
          overflow: hidden;
        }
        .lp-cta-gradient::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(212,88,90,0.15) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .lp-cta-gradient::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(78,205,196,0.12) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        /* Mobile menu */
        .lp-mobile-menu {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .lp-mobile-menu.open {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-mobile-menu.closed {
          opacity: 0;
          transform: translateY(-8px);
          pointer-events: none;
        }

        /* Smooth section wave */
        .lp-wave {
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          line-height: 0;
        }
        .lp-wave svg {
          display: block;
          width: 100%;
          height: 60px;
        }
      `}</style>

      {/* ─── Navigation ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-lg shadow-[0_1px_20px_rgba(44,62,80,0.06)] py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4585A] to-[#FF6B6B] flex items-center justify-center shadow-[0_2px_8px_rgba(212,88,90,0.3)] group-hover:shadow-[0_4px_16px_rgba(212,88,90,0.4)] transition-shadow">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#2C3E50] tracking-tight">
              HPB Content Studio
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm text-[#6B7B8D] hover:text-[#2C3E50] transition-colors cursor-pointer"
            >
              機能
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm text-[#6B7B8D] hover:text-[#2C3E50] transition-colors cursor-pointer"
            >
              料金
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm text-[#6B7B8D] hover:text-[#2C3E50] transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <Link
              to="/login"
              className="text-sm text-[#6B7B8D] hover:text-[#2C3E50] transition-colors"
            >
              ログイン
            </Link>
            <Button asChild size="sm" className="bg-[#D4585A] hover:bg-[#B8484A] text-white rounded-full px-5 shadow-[0_2px_8px_rgba(212,88,90,0.25)] hover:shadow-[0_4px_16px_rgba(212,88,90,0.35)] transition-all">
              <Link to="/signup">無料で始める</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[#2C3E50] cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-lg shadow-lg lp-mobile-menu ${
            mobileMenuOpen ? "open" : "closed"
          }`}
        >
          <div className="px-5 py-4 space-y-3">
            <button
              onClick={() => scrollToSection("features")}
              className="block w-full text-left py-2 text-[#6B7B8D] hover:text-[#2C3E50] cursor-pointer"
            >
              機能
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="block w-full text-left py-2 text-[#6B7B8D] hover:text-[#2C3E50] cursor-pointer"
            >
              料金
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="block w-full text-left py-2 text-[#6B7B8D] hover:text-[#2C3E50] cursor-pointer"
            >
              FAQ
            </button>
            <Link
              to="/login"
              className="block py-2 text-[#6B7B8D] hover:text-[#2C3E50]"
            >
              ログイン
            </Link>
            <Button asChild className="w-full bg-[#D4585A] hover:bg-[#B8484A] text-white rounded-full shadow-[0_2px_8px_rgba(212,88,90,0.25)]">
              <Link to="/signup">無料で始める</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-[#FFFBF7] via-[#FFF8F2] to-[#FFF5EE]">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="lp-blob-1 absolute top-[15%] right-[10%] w-[340px] h-[340px] rounded-full bg-[#FF6B6B]/[0.08] blur-[80px]" />
          <div className="lp-blob-2 absolute bottom-[20%] left-[5%] w-[280px] h-[280px] rounded-full bg-[#4ECDC4]/[0.08] blur-[80px]" />
          <div className="lp-blob-3 absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full bg-[#FFE66D]/[0.1] blur-[60px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pt-28 pb-20 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="lp-hero-anim inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-[#EDE4DA] shadow-[0_2px_12px_rgba(44,62,80,0.04)] mb-8">
                <Sparkles className="w-3.5 h-3.5 text-[#D4585A]" />
                <span className="text-xs font-medium text-[#6B7B8D] tracking-wide">
                  AIテキスト生成ツール for HPB
                </span>
              </div>

              <h1 className="lp-serif lp-hero-anim lp-hero-anim-d1 text-[2.5rem] sm:text-[3.2rem] lg:text-[3.6rem] font-bold leading-[1.3] tracking-tight text-[#2C3E50]">
                HPBの文章運用、
                <br />
                <span className="lp-gradient-text">Chromeタブですっきり。</span>
              </h1>

              <p className="lp-hero-anim lp-hero-anim-d2 mt-7 text-[#6B7B8D] text-base sm:text-lg leading-[1.9] max-w-lg mx-auto lg:mx-0">
                スタイリストの個性を活かした
                <br className="hidden sm:block" />
                ブログ・紹介文・プロフィールを
                <br className="hidden sm:block" />
                AIが下書き。コピーして貼るだけ。
              </p>

              <div className="lp-hero-anim lp-hero-anim-d3 flex flex-col sm:flex-row gap-3 mt-10 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#D4585A] hover:bg-[#B8484A] text-white rounded-full px-8 h-12 text-base shadow-[0_4px_20px_rgba(212,88,90,0.3)] hover:shadow-[0_6px_28px_rgba(212,88,90,0.4)] transition-all"
                >
                  <Link to="/signup">
                    無料で始める
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 h-12 text-base border-[#EDE4DA] text-[#6B7B8D] hover:text-[#2C3E50] hover:border-[#D4585A]/30 hover:bg-[#FFF5F0] transition-all cursor-pointer"
                  onClick={() => scrollToSection("features")}
                >
                  機能を見る
                </Button>
              </div>

              <p className="lp-hero-anim lp-hero-anim-d3 mt-5 text-xs text-[#B0A090]">
                クレジットカード不要 ・ 月30回まで無料
              </p>
            </div>

            {/* Right: Preview Card */}
            <div className="lp-hero-anim lp-hero-anim-d4 flex-shrink-0">
              <ContentPreviewCard />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="lp-wave">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none">
            <path
              d="M0 20C240 45 480 55 720 40C960 25 1200 35 1440 20V61H0V20Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <StatsBar />

      {/* ─── Pain Points ─── */}
      <section className="relative bg-white py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="sr text-sm font-semibold text-[#D4585A] tracking-widest uppercase mb-3">
              Problem
            </p>
            <h2 className="sr sr-d1 lp-serif text-3xl sm:text-4xl font-bold text-[#2C3E50] leading-tight">
              こんなお悩み、ありませんか？
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {painPoints.map((item, i) => (
              <div
                key={i}
                className={`sr sr-d${i + 1} group bg-[#FFFBF7] rounded-2xl p-7 border border-[#F0E6DC]/60 hover:border-[#D4585A]/20 transition-all duration-400 hover:shadow-[0_8px_30px_rgba(44,62,80,0.06)]`}
              >
                <div className="w-11 h-11 rounded-xl bg-[#D4585A]/[0.08] flex items-center justify-center mb-5 group-hover:bg-[#D4585A]/[0.12] transition-colors">
                  <item.icon className="w-5 h-5 text-[#D4585A]" />
                </div>
                <h3 className="text-lg font-bold text-[#2C3E50] mb-3 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[15px] text-[#6B7B8D] leading-[1.8]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section
        id="features"
        className="relative bg-gradient-to-b from-[#FFFBF7] to-[#FFF8F2] py-24 sm:py-32"
      >
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="sr text-sm font-semibold text-[#4ECDC4] tracking-widest uppercase mb-3">
              Features
            </p>
            <h2 className="sr sr-d1 lp-serif text-3xl sm:text-4xl font-bold text-[#2C3E50] leading-tight">
              AIが、あなた専属のライターに。
            </h2>
            <p className="sr sr-d2 mt-5 text-[#6B7B8D] max-w-xl mx-auto leading-[1.8]">
              HPBに必要な7種類のテキストを、スタイリストの個性に合わせてAIが生成。
              <br className="hidden sm:block" />
              もう文章に悩む時間は必要ありません。
            </p>
          </div>

          {/* Content Types Grid */}
          <div className="grid sm:grid-cols-2 gap-5">
            {features.map((feat, i) => (
              <div
                key={i}
                className={`sr sr-d${i + 1} lp-feature-card bg-white rounded-2xl p-7 border border-[#F0E6DC]/60 cursor-default`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: feat.bg }}
                  >
                    <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-[#2C3E50]">{feat.type}</h3>
                      <span
                        className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: feat.bg,
                          color: feat.color,
                        }}
                      >
                        {feat.limit}
                      </span>
                    </div>
                    <p className="text-[15px] text-[#6B7B8D] leading-[1.7]">{feat.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Features */}
          <div className="mt-12 grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: MessageSquare,
                title: "チャットで修正",
                desc: "「もっとカジュアルに」「絵文字を入れて」— 会話するように文章を調整",
              },
              {
                icon: Hash,
                title: "HPB文字数カウンター",
                desc: "HPB基準の全角カウントで文字数超過を防止。リアルタイム表示",
              },
              {
                icon: Copy,
                title: "ワンクリックコピー",
                desc: "生成結果をワンクリックでコピー。HPB管理画面にそのまま貼り付け",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`sr sr-d${i + 1} flex items-start gap-3 bg-white/60 rounded-xl p-5 border border-[#F0E6DC]/40`}
              >
                <item.icon className="w-5 h-5 text-[#D4585A] mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-[#2C3E50] text-sm mb-1">
                    {item.title}
                  </h4>
                  <p className="text-[13px] text-[#6B7B8D] leading-[1.7]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative bg-white py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="sr text-sm font-semibold text-[#D4585A] tracking-widest uppercase mb-3">
              How It Works
            </p>
            <h2 className="sr sr-d1 lp-serif text-3xl sm:text-4xl font-bold text-[#2C3E50] leading-tight">
              かんたん3ステップ
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-5 relative">
            {/* Connector lines (desktop only) */}
            <div className="hidden md:block absolute top-16 left-[calc(33.333%_-_8px)] w-[calc(33.333%_+_16px)] lp-step-line" />
            <div className="hidden md:block absolute top-16 left-[calc(66.666%_-_8px)] w-[calc(33.333%_+_16px)] lp-step-line" />

            {steps.map((step, i) => (
              <div key={i} className={`sr sr-d${i + 1} text-center relative`}>
                <div className="relative inline-flex items-center justify-center w-[72px] h-[72px] mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D4585A]/[0.08] to-[#4ECDC4]/[0.08]" />
                  <div className="relative w-14 h-14 rounded-full bg-white border-2 border-[#EDE4DA] flex items-center justify-center shadow-[0_2px_12px_rgba(44,62,80,0.06)]">
                    <step.icon className="w-5 h-5 text-[#D4585A]" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#D4585A] text-white text-xs font-bold flex items-center justify-center shadow-[0_2px_6px_rgba(212,88,90,0.4)]">
                    {step.num.replace("0", "")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#2C3E50] mb-3">{step.title}</h3>
                <p className="text-[15px] text-[#6B7B8D] leading-[1.8] max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        id="pricing"
        className="relative bg-gradient-to-b from-[#FFFBF7] to-[#FFF8F2] py-24 sm:py-32"
      >
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <p className="sr text-sm font-semibold text-[#4ECDC4] tracking-widest uppercase mb-3">
              Pricing
            </p>
            <h2 className="sr sr-d1 lp-serif text-3xl sm:text-4xl font-bold text-[#2C3E50] leading-tight">
              シンプルな料金プラン
            </h2>
            <p className="sr sr-d2 mt-5 text-[#6B7B8D]">
              まずは無料で始めて、必要に応じてアップグレード。チェーン展開にはTeamプランも。
            </p>
          </div>

          <div className="relative">
            {/* テストマーケティング期間中オーバーレイ */}
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-2xl">
              <div className="text-center px-6 py-8 max-w-lg">
                <p className="lp-serif text-xl sm:text-2xl font-bold text-[#2C3E50] mb-3">
                  Pro / Teamプランは現在準備中です
                </p>
                <p className="text-[15px] text-[#6B7B8D] leading-[1.8]">
                  ご興味のある方は<br className="hidden sm:block" />
                  <span className="font-semibold text-[#2C3E50]">KUROCO株式会社</span>までお気軽にお問い合わせください
                </p>
                <a
                  href="mailto:info@kuroco.team?subject=Proプランについてのお問い合わせ"
                  className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-full bg-[#D4585A] hover:bg-[#B8484A] text-white text-sm font-semibold shadow-[0_4px_16px_rgba(212,88,90,0.3)] hover:shadow-[0_6px_24px_rgba(212,88,90,0.4)] transition-all"
                >
                  info@kuroco.team
                </a>
              </div>
            </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="sr bg-white rounded-2xl border border-[#EDE4DA] p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#2C3E50] mb-1">Free</h3>
                <p className="text-sm text-[#6B7B8D]">まずは気軽にお試し</p>
              </div>
              <div className="mb-8">
                <span className="lp-serif text-4xl font-bold text-[#2C3E50]">¥0</span>
                <span className="text-[#6B7B8D] ml-1">/月</span>
              </div>
              <ul className="space-y-3.5 mb-8 flex-1">
                {[
                  "テキスト・ブログ生成 月5回まで",
                  "スタイリスト登録 3名まで",
                  "チャット修正 3往復/セッション",
                  "サロン 1店舗",
                  "HPB文字数カウンター",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-[#6B7B8D]">
                    <Check className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full h-11 border-[#EDE4DA] text-[#6B7B8D] hover:text-[#2C3E50] hover:border-[#D4585A]/30 hover:bg-[#FFF5F0] transition-all"
              >
                <Link to="/signup">無料で始める</Link>
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="sr sr-d1 lp-pricing-pro rounded-2xl p-8 flex flex-col">
              <div className="bg-white rounded-2xl p-8 flex flex-col h-full">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#2C3E50] mb-1">Pro</h3>
                    <p className="text-sm text-[#6B7B8D]">本格運用に</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#D4585A] to-[#FF6B6B] text-white text-xs font-semibold shadow-[0_2px_8px_rgba(212,88,90,0.3)]">
                    <Sparkles className="w-3 h-3" />
                    おすすめ
                  </span>
                </div>
                <div className="mb-2">
                  <span className="lp-serif text-4xl font-bold text-[#2C3E50]">¥980</span>
                  <span className="text-[#6B7B8D] ml-1">/月</span>
                </div>
                <p className="text-xs text-[#D4585A] font-medium mb-8">
                  14日間の無料トライアル付き
                </p>
                <ul className="space-y-3.5 mb-8 flex-1">
                  {[
                    "テキスト・ブログ生成 無制限",
                    "🏷️ 店舗ルール（タグ付け）",
                    "📚 過去投稿のAI記憶",
                    "✨ 詳細メタデータ反映",
                    "スタイリスト登録 20名まで",
                    "チャット修正 20往復/セッション",
                    "📥 CSVエクスポート",
                    "🔀 ABテスト生成",
                    "⚡ 一括生成",
                    "📅 コンテンツカレンダー",
                    "HPB文字数カウンター",
                    "優先サポート",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-[#2C3E50]">
                      <Check className="w-4 h-4 text-[#D4585A] mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className="w-full rounded-full h-11 bg-[#D4585A]/50 text-white text-sm font-semibold cursor-not-allowed select-none"
                >
                  準備中（Coming Soon）
                </button>
              </div>
            </div>

            {/* Team Plan */}
            <div className="sr sr-d2 bg-white rounded-2xl border-2 border-[#4ECDC4]/30 p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#2C3E50] mb-1">Team</h3>
                <p className="text-sm text-[#6B7B8D]">大規模サロンチェーン向け</p>
              </div>
              <div className="mb-8">
                <span className="lp-serif text-2xl font-bold text-[#2C3E50]">お問い合わせ</span>
              </div>
              <ul className="space-y-3.5 mb-8 flex-1">
                {[
                  "テキスト生成 無制限",
                  "ブログ生成 無制限",
                  "スタイリスト登録 無制限",
                  "チャット修正 20往復/セッション",
                  "サロン登録 無制限",
                  "CSV一括登録",
                  "マルチサロン管理",
                  "メンバー管理",
                  "専任サポート",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-[#2C3E50]">
                    <Check className="w-4 h-4 text-[#4ECDC4] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full h-11 border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all"
              >
                <a href="mailto:info@kuroco.team?subject=Teamプランについてのお問い合わせ">お問い合わせ（KUROCO）</a>
              </Button>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Badge ─── */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-5">
          <div className="sr bg-gradient-to-r from-[#FFFBF7] to-[#FFF8F2] rounded-2xl border border-[#EDE4DA]/60 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-[#4ECDC4]/[0.1] flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-[#4ECDC4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2C3E50] mb-2">
                  「AI下書き → 人が仕上げ」を推奨しています
                </h3>
                <p className="text-[15px] text-[#6B7B8D] leading-[1.8]">
                  HPB Content Studioは、AIが生成したテキストをそのまま掲載するのではなく、
                  必ずスタッフの方が内容を確認・編集してから掲載するワークフローを推奨しています。
                  AIはあくまで「優秀な下書き担当」。最終的な仕上げは人の手で。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section
        id="faq"
        className="relative bg-gradient-to-b from-white to-[#FFFBF7] py-24 sm:py-32"
      >
        <div className="max-w-2xl mx-auto px-5">
          <div className="text-center mb-14">
            <p className="sr text-sm font-semibold text-[#D4585A] tracking-widest uppercase mb-3">
              FAQ
            </p>
            <h2 className="sr sr-d1 lp-serif text-3xl sm:text-4xl font-bold text-[#2C3E50] leading-tight">
              よくあるご質問
            </h2>
          </div>

          <div className="sr sr-d2">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openFAQ === i}
                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="lp-cta-gradient py-24 sm:py-32">
        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <h2 className="sr lp-serif text-3xl sm:text-[2.6rem] font-bold text-white leading-[1.4]">
            文章運用の負担を、
            <br />
            今日から軽くしよう。
          </h2>
          <p className="sr sr-d1 mt-6 text-white/60 text-base sm:text-lg leading-[1.8]">
            毎週の更新作業に追われる日々を終わりにしませんか？
            <br className="hidden sm:block" />
            HPB Content Studioで、コンテンツ作成の新しい体験を。
          </p>
          <div className="sr sr-d2 mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-[#D4585A] hover:bg-white/90 rounded-full px-10 h-13 text-base font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_32px_rgba(0,0,0,0.2)] transition-all"
            >
              <Link to="/signup">
                まずは無料で試してみる
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="sr sr-d3 mt-5 text-white/40 text-sm">
            クレジットカード不要 ・ 月5回まで無料
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-[#1A2530] py-16">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            {/* Logo & tagline */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4585A] to-[#FF6B6B] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold text-white/90">
                  HPB Content Studio
                </span>
              </div>
              <p className="text-sm text-white/40 max-w-xs leading-[1.7]">
                ホットペッパービューティー向け
                <br />
                AIテキストコンテンツ生成ツール
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-16">
              <div>
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">
                  Product
                </h4>
                <ul className="space-y-2.5">
                  <li>
                    <button
                      onClick={() => scrollToSection("features")}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                    >
                      機能
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("pricing")}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                    >
                      料金プラン
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("faq")}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                    >
                      FAQ
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">
                  Account
                </h4>
                <ul className="space-y-2.5">
                  <li>
                    <Link
                      to="/login"
                      className="text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                      ログイン
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/signup"
                      className="text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                      新規登録
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} HPB Content Studio. All rights reserved.
            </p>
            <p className="text-xs text-white/20">
              ※ 当サービスはリクルート社・ホットペッパービューティーの公式サービスではありません
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

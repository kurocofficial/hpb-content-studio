import { useState, useCallback, useEffect } from "react";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { CsvImportJob } from "@/types";
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
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

const salonSampleData = {
  headers: ["name", "area", "concept", "target_customer", "strength"],
  headerLabels: ["サロン名 *", "エリア *", "コンセプト", "ターゲット顧客", "強み"],
  rows: [
    ["渋谷サロンA", "渋谷", "ナチュラル美容", "20代女性", "透明感カラー"],
    ["表参道サロンB", "表参道", "大人のリラクゼーション", "30〜40代女性", "髪質改善トリートメント"],
    ["新宿サロンC", "新宿", "トレンド最先端", "10〜20代男女", "デザインカラー・ハイトーン"],
  ],
};

const stylistSampleData = {
  headers: [
    "salon_name", "name", "role", "years_experience", "specialties",
    "style_features", "personality", "writing_tone", "writing_emoji", "writing_sentence_style",
  ],
  headerLabels: [
    "サロン名 *", "スタイリスト名 *", "役職", "経験年数", "得意技術（;区切り）",
    "スタイル特徴（;区切り）", "性格・人柄", "文体トーン", "絵文字頻度", "文の長さ",
  ],
  rows: [
    ["渋谷サロンA", "田中太郎", "店長", "15", "カット;カラー;パーマ", "ナチュラル;エアリー", "明るくて優しい", "friendly", "moderate", "medium"],
    ["渋谷サロンA", "佐藤花子", "スタイリスト", "8", "カラー;トリートメント", "透明感;ツヤ髪", "丁寧で落ち着いている", "professional", "minimal", "long"],
    ["表参道サロンB", "鈴木一郎", "代表", "20", "カット;ヘッドスパ", "大人可愛い;上品", "穏やかで信頼感がある", "formal", "none", "medium"],
  ],
};

export default function CsvImportPage() {
  const { organization, importJobs, fetchImportJobs } =
    useOrganizationStore();
  const { plan } = useAuthStore();
  const { toast } = useToast();

  const [importType, setImportType] = useState<"salons" | "stylists">("salons");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<CsvImportJob | null>(null);
  const [showSalonSample, setShowSalonSample] = useState(false);
  const [showStylistSample, setShowStylistSample] = useState(false);

  useEffect(() => {
    if (organization) {
      fetchImportJobs();
    }
  }, [organization, fetchImportJobs]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith(".csv")) {
        toast({
          title: "エラー",
          description: "CSVファイルを選択してください",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setLastResult(null);

      // プレビュー表示（先頭5行）
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        const rows = lines.slice(0, 6).map((line) => line.split(","));
        setPreviewRows(rows);
      };
      reader.readAsText(file, "utf-8");
    },
    [toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.name.endsWith(".csv")) {
        setSelectedFile(file);
        setLastResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split("\n").filter((l) => l.trim());
          const rows = lines.slice(0, 6).map((line) => line.split(","));
          setPreviewRows(rows);
        };
        reader.readAsText(file, "utf-8");
      } else {
        toast({
          title: "エラー",
          description: "CSVファイルをドロップしてください",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleUpload = async () => {
    if (!selectedFile || !organization) return;

    setIsUploading(true);
    try {
      const result = await api.uploadFile<CsvImportJob>(
        `/api/v1/organizations/${organization.id}/import/${importType}`,
        selectedFile
      );
      setLastResult(result);
      await fetchImportJobs();

      if (result.status === "completed") {
        toast({
          title: "インポート完了",
          description: `${result.success_count}件を登録しました`,
          variant: "success",
        });
      } else {
        toast({
          title: "インポート失敗",
          description: `${result.error_count}件のエラーがあります`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (plan !== "team" && !import.meta.env.DEV) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">CSV一括登録</h1>
          <p className="text-muted-foreground">
            この機能はTeamプラン専用です。
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">CSV一括登録</h1>

        {/* サロンCSVテンプレート */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">サロンCSVテンプレート</CardTitle>
                <CardDescription>
                  サロン情報を一括登録するためのCSVテンプレートです（* は必須項目）
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSalonSample(!showSalonSample)}
                >
                  {showSalonSample ? (
                    <><EyeOff className="h-4 w-4 mr-1" />閉じる</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-1" />サンプル表示</>
                  )}
                </Button>
                <a href="/templates/salons_template.csv" download="salons_template.csv">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    ダウンロード
                  </Button>
                </a>
              </div>
            </div>
          </CardHeader>
          {showSalonSample && (
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      {salonSampleData.headerLabels.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 bg-gradient-to-b from-rose-50 to-orange-50 text-left font-semibold text-gray-700 border-b whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {salonSampleData.headers.map((h, i) => (
                        <td
                          key={i}
                          className="px-3 py-1 bg-gray-50 text-xs text-muted-foreground font-mono border-b"
                        >
                          {h}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salonSampleData.rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 border-b text-gray-600 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        {/* スタイリストCSVテンプレート */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">スタイリストCSVテンプレート</CardTitle>
                <CardDescription>
                  スタイリスト情報を一括登録するためのCSVテンプレートです（* は必須項目 / セミコロン ; で複数指定可）
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStylistSample(!showStylistSample)}
                >
                  {showStylistSample ? (
                    <><EyeOff className="h-4 w-4 mr-1" />閉じる</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-1" />サンプル表示</>
                  )}
                </Button>
                <a href="/templates/stylists_template.csv" download="stylists_template.csv">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    ダウンロード
                  </Button>
                </a>
              </div>
            </div>
          </CardHeader>
          {showStylistSample && (
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      {stylistSampleData.headerLabels.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 bg-gradient-to-b from-rose-50 to-orange-50 text-left font-semibold text-gray-700 border-b whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {stylistSampleData.headers.map((h, i) => (
                        <td
                          key={i}
                          className="px-3 py-1 bg-gray-50 text-xs text-muted-foreground font-mono border-b"
                        >
                          {h}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stylistSampleData.rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 border-b text-gray-600 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        {/* インポートタイプ選択 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">アップロード</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Button
                variant={importType === "salons" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setImportType("salons");
                  setSelectedFile(null);
                  setPreviewRows([]);
                  setLastResult(null);
                }}
              >
                サロン一括登録
              </Button>
              <Button
                variant={importType === "stylists" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setImportType("stylists");
                  setSelectedFile(null);
                  setPreviewRows([]);
                  setLastResult(null);
                }}
              >
                スタイリスト一括登録
              </Button>
            </div>

            {/* ドラッグ&ドロップエリア */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                CSVファイルをドラッグ&ドロップ
              </p>
              <p className="text-xs text-muted-foreground mb-3">または</p>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>ファイルを選択</span>
                </Button>
              </label>
            </div>

            {/* プレビュー */}
            {previewRows.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  プレビュー（先頭{Math.min(5, previewRows.length - 1)}行）
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {previewRows[0]?.map((h, i) => (
                          <th
                            key={i}
                            className="border px-2 py-1 bg-muted text-left"
                          >
                            {h.trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(1).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="border px-2 py-1">
                              {cell.trim()}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  className="mt-4"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      インポート中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      インポート実行
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* 結果表示 */}
            {lastResult && (
              <div className="mt-4">
                <div
                  className={`p-4 rounded-lg ${
                    lastResult.status === "completed"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {lastResult.status === "completed"
                        ? "インポート完了"
                        : "インポート失敗"}
                    </span>
                  </div>
                  <p className="text-sm">
                    全{lastResult.total_rows}行 / 成功{" "}
                    {lastResult.success_count}件 / 失敗{" "}
                    {lastResult.error_count}件
                  </p>

                  {lastResult.error_details.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">エラー詳細:</p>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="border px-2 py-1 bg-red-100 text-left">
                              行
                            </th>
                            <th className="border px-2 py-1 bg-red-100 text-left">
                              フィールド
                            </th>
                            <th className="border px-2 py-1 bg-red-100 text-left">
                              エラー内容
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastResult.error_details.map((err, i) => (
                            <tr key={i}>
                              <td className="border px-2 py-1">{err.row}</td>
                              <td className="border px-2 py-1">{err.field}</td>
                              <td className="border px-2 py-1">
                                {err.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* インポート履歴 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">インポート履歴</CardTitle>
          </CardHeader>
          <CardContent>
            {importJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                まだインポート履歴がありません
              </p>
            ) : (
              <div className="space-y-2">
                {importJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{job.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.import_type === "salons"
                            ? "サロン"
                            : "スタイリスト"}{" "}
                          / {new Date(job.created_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === "completed" && (
                        <span className="flex items-center text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {job.success_count}件成功
                        </span>
                      )}
                      {job.status === "failed" && (
                        <span className="flex items-center text-xs text-red-600">
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          {job.error_count}件エラー
                        </span>
                      )}
                      {job.status === "processing" && (
                        <span className="flex items-center text-xs text-blue-600">
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          処理中
                        </span>
                      )}
                      {job.status === "pending" && (
                        <span className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          待機中
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

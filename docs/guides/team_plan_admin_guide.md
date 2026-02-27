# Teamプラン管理者ガイド

## 概要

Teamプランは、大規模サロンチェーン（5店舗以上・スタイリスト30名以上）向けのプランです。複数サロンの一括管理、CSVによるデータ一括登録、メンバー管理機能を提供します。

## セットアップの流れ

### 1. 組織の作成（CLI）

```bash
cd backend
python -m cli.main org create \
  --name "ABC美容グループ" \
  --owner-email "admin@abc-beauty.com" \
  --contact-email "info@abc-beauty.com" \
  --contact-phone "03-1234-5678"
```

組織IDが出力されるので控えておいてください。

### 2. Teamプランの割り当て（CLI）

```bash
python -m cli.main plan set-team \
  --user-email "admin@abc-beauty.com" \
  --org-id <組織ID>
```

### 3. メンバーの追加

#### CLI での追加

```bash
python -m cli.main org add-member \
  --org-id <組織ID> \
  --email "manager@abc-beauty.com" \
  --role admin
```

#### Web UI での追加

1. Teamプランユーザーでログイン
2. サイドバー「メンバー管理」をクリック
3. 「メンバー追加」ボタンからメールアドレスとロールを指定

### 4. サロンの登録

#### 個別登録

Web UI から「サロン一覧」→「サロン追加」

#### CSV一括登録

1. テンプレートをダウンロード
2. サロン情報を記入
3. 「CSV一括登録」ページでアップロード

### 5. スタイリストの登録

#### CSV一括登録

1. テンプレートをダウンロード
2. `salon_name` には先に登録済みのサロン名を正確に記入
3. 「CSV一括登録」ページでアップロード

## ロールと権限

| 権限 | owner | admin | member |
|------|-------|-------|--------|
| コンテンツ生成 | o | o | o |
| サロン閲覧 | o | o | o |
| サロン追加・編集 | o | o | x |
| CSV一括登録 | o | o | x |
| メンバー管理 | o | o | x |
| 組織情報編集 | o | o | x |
| メンバー削除 | o | o | x |
| オーナー変更 | x | x | x |

## CLIコマンドリファレンス

### 組織管理

```bash
# 組織作成
python -m cli.main org create --name <名前> --owner-email <メール>

# メンバー追加
python -m cli.main org add-member --org-id <ID> --email <メール> --role <admin|member>

# メンバー一覧
python -m cli.main org list-members --org-id <ID>
```

### プラン管理

```bash
# Teamプラン割り当て
python -m cli.main plan set-team --user-email <メール> --org-id <ID>

# プラン情報確認
python -m cli.main plan info --user-email <メール>
```

### CSV一括登録

```bash
# サロンCSVインポート
python -m cli.main import salons --org-id <ID> --file ./data/salons.csv

# スタイリストCSVインポート
python -m cli.main import stylists --org-id <ID> --file ./data/stylists.csv
```

## トラブルシューティング

### Q: メンバーを追加できない
- ユーザーが先にアカウント登録（サインアップ）している必要があります
- メールアドレスが正確か確認してください

### Q: スタイリストCSVインポートで「サロンが見つかりません」エラー
- `salon_name` と登録済みサロン名が完全一致している必要があります
- 先にサロンCSVインポートを実行してからスタイリストCSVをインポートしてください

### Q: プラン変更が反映されない
- ブラウザをリロードしてください
- CLIで `plan info` コマンドでプランを確認してください

### Q: CSVファイルが文字化けする
- UTF-8エンコーディングで保存してください
- Excelの場合は「UTF-8（BOM付き）」で保存してください
- Shift-JISも対応していますが、UTF-8を推奨します

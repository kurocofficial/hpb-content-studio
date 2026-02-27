# HPB Content Studio — 管理者CLI

Teamプラン運用のための管理者CLIツールです。

## セットアップ

```bash
cd backend
pip install -r requirements.txt  # click が追加されています
```

## 使い方

```bash
# backendディレクトリから実行
cd backend
python -m cli.main <コマンド>
```

## コマンド一覧

### org — 組織管理

```bash
# 組織を作成
python -m cli.main org create \
  --name "ABC美容グループ" \
  --owner-email "admin@abc.com" \
  --contact-email "info@abc.com" \
  --contact-phone "03-1234-5678"

# メンバーを追加
python -m cli.main org add-member \
  --org-id <UUID> \
  --email "user@example.com" \
  --role admin  # admin or member

# メンバー一覧
python -m cli.main org list-members --org-id <UUID>
```

### plan — プラン管理

```bash
# Teamプランを割り当て
python -m cli.main plan set-team \
  --user-email "admin@abc.com" \
  --org-id <UUID>

# プラン情報を確認
python -m cli.main plan info --user-email "admin@abc.com"
```

### import — CSV一括登録

```bash
# サロンCSVをインポート
python -m cli.main import salons \
  --org-id <UUID> \
  --file ./data/salons.csv

# スタイリストCSVをインポート
python -m cli.main import stylists \
  --org-id <UUID> \
  --file ./data/stylists.csv
```

CSVフォーマットの詳細は `docs/guides/csv_import_guide.md` を参照してください。

## 典型的なセットアップフロー

```bash
# 1. 組織作成
python -m cli.main org create --name "ABC美容グループ" --owner-email "admin@abc.com"
# → 組織ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 2. Teamプラン割り当て
python -m cli.main plan set-team --user-email "admin@abc.com" --org-id <org-id>

# 3. サロンCSVインポート
python -m cli.main import salons --org-id <org-id> --file ./data/salons.csv

# 4. スタイリストCSVインポート
python -m cli.main import stylists --org-id <org-id> --file ./data/stylists.csv

# 5. メンバー追加（必要に応じて）
python -m cli.main org add-member --org-id <org-id> --email "manager@abc.com" --role admin
```

## 開発モード

`mock_auth=True`（デフォルト）の場合、メールアドレスからダミーのユーザーIDが生成されます。本番環境ではSupabase Authのユーザー検索が使用されます。

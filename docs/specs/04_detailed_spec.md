# HPB Content Studio — 詳細機能仕様書

**ドキュメントバージョン**: v1.0
**作成日**: 2025-02-05

---

## 1. 認証・アカウント管理

### 1.1 サインアップフロー

```
[メールアドレス入力] → [パスワード入力（8文字以上）]
  → [確認メール送信] → [メール内リンクをクリック]
  → [サロン情報入力（名前、エリア）]
  → [オンボーディングチャットへ or スキップ]
  → [ダッシュボード]
```

- Supabase Authでメール認証
- パスワード要件: 8文字以上、英数字混在
- サロン情報は最低限（名前のみ必須）で開始可能
- 将来: Google OAuth追加検討

### 1.2 ログイン

- メール + パスワード
- 「ログイン状態を保持」チェックボックス（Supabase session管理）
- パスワードリセット（メール送信）

### 1.3 アカウント設定

- メールアドレス変更
- パスワード変更
- サロン情報編集
- アカウント削除（データ完全削除、Stripeサブスクも解約）

---

## 2. スタイリスト管理 — 詳細仕様

### 2.1 登録方法

2通りの登録方法を提供する。

**方法A: フォーム入力（Phase 1で実装）**
- 各項目をフォームで直接入力
- 必須項目: 表示名、得意メニュー（1つ以上）
- 任意項目: その他すべて

**方法B: オンボーディングチャット（Phase 2で実装）**
- チャット形式で対話しながら情報収集
- 選択式＋自由入力のハイブリッド
- 8ステップ構成、途中保存可能
- 収集した情報をメタデータJSONに変換してDB保存

### 2.2 オンボーディングチャット — ステップ詳細

| Step | 質問内容 | 入力形式 | メタデータ保存先 |
|------|---------|---------|----------------|
| 1 | 名前・表示名 | テキスト入力 | display_name, real_name |
| 2 | 経験年数 | 数値選択 | experience_years |
| 3 | 得意メニュー | 複数選択 + 自由入力 | specialties |
| 4 | 得意スタイル・こだわり | 自由入力 | style_features |
| 5 | ターゲット客層 | 選択 + 自由入力 | (salon.target_audience) |
| 6 | 文体の好み | 3択 + カスタム | writing_style |
| 7 | 画像スタイル好み（Pro表示） | 選択式 | image_style_prefs |
| 8 | SNS情報 | テキスト入力 | sns_info |

**Step 6: 文体の好みの選択肢:**

```
① フレンドリー＆カジュアル
   → {tone: "friendly", formality: "casual", emoji: true}
   例: 「こんにちは♪ Misakiです！カラー大好きです✨」

② 丁寧＆プロフェッショナル
   → {tone: "professional", formality: "polite", emoji: false}
   例: 「はじめまして。スタイリストのMisakiと申します。」

③ おしゃれ＆トレンド感
   → {tone: "trendy", formality: "casual_polite", emoji: true}
   例: 「透明感って、永遠のテーマですよね。Misakiです。」

④ 自分でカスタマイズ
   → 詳細設定画面へ
```

### 2.3 メタデータのプロンプト合成

スタイリストのメタデータは、以下の形式でプロンプトに自動挿入される。

```python
def build_stylist_context(stylist: Stylist) -> str:
    """スタイリストメタデータをプロンプト用テキストに変換"""
    
    context = f"""
【スタイリスト情報】
名前: {stylist.display_name}
経験年数: {stylist.experience_years}年
得意メニュー: {', '.join(stylist.specialties)}
スタイルの特徴: {stylist.style_features.get('得意スタイル', '')}
こだわり: {stylist.style_features.get('こだわり', '')}

【文体指定】
トーン: {stylist.writing_style.get('tone', 'friendly')}
敬語レベル: {stylist.writing_style.get('formality', 'casual_polite')}
絵文字使用: {'あり' if stylist.writing_style.get('emoji', True) else 'なし'}
"""
    return context
```

---

## 3. テキスト生成 — 詳細仕様

### 3.1 生成リクエスト処理フロー

```python
async def generate_content(request: GenerateRequest) -> GenerateResponse:
    # 1. 利用量チェック
    if not await check_usage_limit(request.user_id, request.content_type):
        raise UsageLimitExceeded("月間生成上限に達しました")
    
    # 2. スタイリスト・サロン情報取得
    stylist = await get_stylist(request.stylist_id)
    salon = await get_salon(stylist.salon_id)
    
    # 3. プロンプトテンプレート取得
    template = await get_active_template(request.content_type, request.template_name)
    
    # 4. プロンプト合成
    prompt = prompt_engine.build(
        template=template,
        salon=salon,
        stylist=stylist,
        parameters=request.parameters,
        char_limit=get_hpb_char_limit(request.content_type)
    )
    
    # 5. Gemini API呼び出し（ストリーミング）
    response_text = await gemini_service.generate(prompt, stream=True)
    
    # 6. 後処理
    char_count = count_fullwidth_chars(response_text)
    
    # 7. DB保存
    content = await save_content(
        stylist_id=request.stylist_id,
        content_type=request.content_type,
        body=response_text,
        char_count=char_count,
        prompt_used=prompt
    )
    
    # 8. 利用量インクリメント
    await increment_usage(request.user_id, request.content_type)
    
    return content
```

### 3.2 コンテンツ種別ごとの仕様

#### サロンキャッチコピー
- 文字数: 全角45文字以内
- 生成パターン: 3案同時生成
- プロンプト指示: サロンの最大の特徴を1文で、印象的なフレーズで

#### サロン紹介文
- 文字数: 全角500文字以内
- 構成: 挨拶 → 特徴 → 得意メニュー → こだわり → 来店促進
- プロンプト指示: HPBユーザーが読んで予約したくなる文章

#### スタイリストプロフィール
- 文字数: 全角200文字以内
- 構成: 自己紹介 → 得意分野 → メッセージ
- プロンプト指示: スタイリストの人柄と技術が伝わる自己紹介

#### スタイル説明文
- 文字数: 全角70文字以内
- 入力: スタイル名（例: 「透明感ベージュのレイヤーボブ」）
- プロンプト指示: ヘアスタイルの特徴と似合う人を簡潔に

#### ブログ記事
- 文字数: 1,000〜5,000文字（ユーザー指定可能）
- テンプレート: 7種（詳細は3.3参照）
- プロンプト指示: SEOを意識、読みやすい段落構成、見出し付き
- 出力: HTML形式（HPBブログに対応）

#### クーポン説明文
- 文字数: 全角200文字以内
- 入力: メニュー名、通常価格、クーポン価格、ターゲット
- プロンプト指示: お得感と施術内容が伝わる簡潔な説明

#### 口コミ返信
- 入力: 口コミ本文をペースト
- 生成: 3パターン同時（丁寧/フレンドリー/簡潔）
- 自動判定: 口コミの評価レベル（高/中/低）を推定して対応を調整

### 3.3 ブログテンプレート — プロンプト設計

**トレンド紹介型:**
```
あなたは{stylist.display_name}として、HPBのブログ記事を書きます。

テーマ: {user_topic}
キーワード: {user_keywords}
文字数: {target_length}文字程度

構成:
1. 導入（読者の関心を引く）
2. トレンドの紹介（3〜5項目）
3. 各項目の特徴と、{stylist.display_name}のおすすめポイント
4. まとめ + 来店促進

{stylist_context}
{salon_context}
{writing_style_instructions}
```

### 3.4 全角文字数カウント仕様

```python
def count_fullwidth_chars(text: str) -> int:
    """HPBの文字数カウントに合わせた全角文字数計算"""
    count = 0
    for char in text:
        if unicodedata.east_asian_width(char) in ('F', 'W'):
            count += 1  # 全角 = 1文字
        else:
            count += 0.5  # 半角 = 0.5文字
    return int(count)
```

---

## 4. チャット修正 — 詳細仕様

### 4.1 処理フロー

```
[ユーザーが修正指示を入力]
  → [現在のテキスト + 修正指示 + メタデータ → プロンプト構築]
  → [Gemini API呼び出し（ストリーミング）]
  → [修正テキスト受信 → リアルタイム表示]
  → [generated_contentsのbodyを更新]
  → [chat_sessionsにメッセージ追加]
```

### 4.2 チャットプロンプト設計

```
あなたは美容サロンのHPBコンテンツ編集アシスタントです。
以下のテキストをユーザーの指示に従って修正してください。

【現在のテキスト】
{current_body}

【スタイリスト情報】
{stylist_context}

【HPB制約】
文字数上限: {char_limit}文字

【修正指示】
{user_message}

修正後のテキストのみを出力してください。説明は不要です。
```

### 4.3 利用制限

| プラン | 1セッションあたりの往復数 | 理由 |
|-------|------------------------|------|
| Free | 3往復 | API費用抑制 |
| Pro | 20往復 | 実用十分。無制限だとコスト爆発リスク |

制限到達時の表示:
- Free: 「修正回数の上限に達しました。Proプランなら無制限で修正できます → [アップグレード]」
- Pro: 「修正回数の上限（20回）に達しました。新しいセッションを開始してください」

---

## 5. 一括生成 — 詳細仕様（Phase 2 / Pro限定）

### 5.1 フロー

```
[スタイリスト選択（複数可）]
  → [コンテンツ種別×生成数を設定]
     例: Misaki → ブログ2本、スタイル説明5本
         Yuki → ブログ1本、スタイル説明3本
  → [各コンテンツの簡易パラメータ設定]
  → [一括生成実行]
  → [進捗バー表示（並列処理）]
  → [結果一覧 → 個別にコピー/修正]
```

### 5.2 並列処理

- 最大5コンテンツを同時生成（Gemini APIレート制限考慮）
- キュー管理: asyncio.Semaphore(5)
- 1コンテンツ失敗しても他は継続
- 全完了後に結果一覧を表示

### 5.3 一括エクスポート

```
[エクスポートボタン]
  → [フォーマット選択: CSV / Excel]
  → [ダウンロード]

CSV構成:
スタイリスト名, コンテンツ種別, タイトル, 本文, 文字数, HPB上限, 生成日時
```

---

## 6. Stripe決済 — 詳細仕様

### 6.1 料金体系

| 項目 | 値 |
|------|-----|
| Proプラン月額 | ¥500〜1,000（最終決定待ち） |
| 無料トライアル | 14日間 |
| 決済サイクル | 月次 |
| 決済方法 | クレジットカード（Stripe Checkout） |

### 6.2 Stripe構成

```
Stripe Product: "HPB Content Studio Pro"
  └── Price: ¥XXX/month (recurring)

Customer → Subscription → Invoice (monthly)
```

### 6.3 サブスクリプション状態遷移

```
[Free] → [Trial開始（14日）] → [決済成功 → Active]
                              → [決済失敗 → Past Due → 3日後 → Canceled → Free]
[Active] → [ユーザー解約 → Canceled（期間末まで利用可） → Free]
```

### 6.4 UI上の表示

**Freeユーザー向け:**
- ダッシュボードにPro訴求バナー
- Pro限定機能に🔒マーク + 「Proで解放」ボタン
- 利用制限到達時にアップグレード促進

**Proユーザー向け:**
- ダッシュボードに「Proプラン ✓」バッジ
- 設定画面でサブスクリプション管理（Stripe Customer Portal）
- 請求履歴の確認

**トライアル中:**
- 「トライアル残りX日」バナー
- トライアル終了3日前にメール通知

---

## 7. HPB規約コンプライアンス機能

### 7.1 テキスト生成時の安全策

- **禁止表現チェック**: 医療的表現（「治す」「治療」等）、誇大表現（「日本一」「最高の」等）を生成後にスキャン
- **掲載前確認促進**: 「⚠️ AI生成テキストです。掲載前に必ずご自身で内容をご確認ください」を全出力画面に表示
- **免責表示**: 「本アプリで生成したコンテンツの正確性・適切性は保証しません。HPBの掲載基準はユーザーご自身でご確認ください」

### 7.2 AI画像生成時の安全策

- 生成画面トップに赤色警告バナー: 「⚠️ AI生成画像はホットペッパービューティーには掲載できません（HPB規約に基づく）」
- ダウンロード時にも再度警告ダイアログ
- 画像メタデータに「AI Generated」フラグ付与
- 用途選択を必須化（Instagram/カウンセリング/教育/その他）

---

## 8. エラーハンドリング

### 8.1 エラー分類

| エラー種別 | 例 | ユーザー表示 |
|-----------|-----|------------|
| 認証エラー | セッション切れ | 「セッションが切れました。再ログインしてください」 |
| 利用制限 | 月間上限到達 | 「今月の生成回数上限に達しました。Proプランで無制限に → [アップグレード]」 |
| API エラー | Gemini API障害 | 「生成に失敗しました。しばらくしてから再度お試しください [再試行]」 |
| 文字数超過 | HPB上限超え | 「⚠️ 文字数が超過しています（XXX / YYY文字）[✂️ 自動で収める]」 |
| 決済エラー | カード拒否 | 「お支払いに失敗しました。カード情報をご確認ください [カード変更]」 |
| ネットワーク | 接続断 | 「接続が切断されました。インターネット接続をご確認ください」 |

### 8.2 リトライ戦略

- Gemini API: 3回リトライ（exponential backoff: 1s, 2s, 4s）
- Stripe Webhook: Stripe側の自動リトライに依存
- DBエラー: 即時エラー返却（リトライなし）

---

## 9. Phase 1 MVP — 実装チェックリスト

### 9.1 バックエンド

- [ ] FastAPIプロジェクトセットアップ
- [ ] Supabase接続設定
- [ ] ユーザー認証（Supabase Auth連携）
- [ ] サロンCRUD API
- [ ] スタイリストCRUD API（フォーム入力）
- [ ] プロンプトエンジン（メタデータ合成）
- [ ] テキスト生成API（4種: キャッチ、紹介文、プロフィール、ブログ）
- [ ] Gemini API統合（ストリーミング対応）
- [ ] チャット修正API
- [ ] 利用量トラッキング（Freeプラン制限）
- [ ] HPB文字数制限チェック
- [ ] エラーハンドリング

### 9.2 フロントエンド

- [ ] React + TypeScript + Vite セットアップ
- [ ] TailwindCSS + shadcn/ui セットアップ
- [ ] ログイン/サインアップ画面
- [ ] ダッシュボード画面
- [ ] スタイリスト一覧/登録/編集画面
- [ ] コンテンツ生成画面（種別選択 → パラメータ → 生成）
- [ ] 生成結果画面（テキスト表示 + コピーボタン + 文字数カウンター）
- [ ] チャット修正画面（左右分割: テキスト | チャット）
- [ ] コンテンツ履歴画面
- [ ] 利用量表示
- [ ] レスポンシブ基本対応

### 9.3 インフラ

- [ ] Supabaseプロジェクト作成
- [ ] DBマイグレーション実行
- [ ] RLSポリシー設定
- [ ] Vercelデプロイ設定
- [ ] Railwayデプロイ設定
- [ ] 環境変数設定
- [ ] Sentry設定

---

## 10. 今後の検討事項

| 項目 | 概要 | 優先度 | 検討時期 |
|------|------|--------|---------|
| 多店舗対応 | 1アカウントで複数サロン管理 | 中 | **実装済み（Teamプラン）** |
| ブラウザ拡張 | サロンボードへの半自動転記 | 高 | ローンチ後 |
| Instagram連携 | 生成コンテンツをInstagramに直接投稿 | 中 | ローンチ後 |
| 分析ダッシュボード | 生成コンテンツの効果測定 | 低 | 将来 |
| チーム機能 | 複数スタッフによる共同編集 | 中 | **実装済み（Teamプラン）** |
| API公開 | 外部サービスからの利用 | 低 | 将来 |
| Proプラン上位プラン | 大規模サロン向け | 低 | **実装済み（Teamプラン）** |

---

## Teamプラン機能仕様（追加セクション）

### 概要

大規模美容サロンチェーン（5店舗以上・スタイリスト30名以上）向けのプラン。`organizations` テーブルを基盤にマルチサロン・マルチユーザーを実現。

### 組織（Organization）

- 1組織 = 1契約単位
- オーナー（owner）は1名で全権限を保持
- 管理者（admin）はサロン管理、CSV登録、メンバー管理が可能
- メンバー（member）はコンテンツ生成のみ

### CSV一括登録

- **対応形式**: サロンCSV、スタイリストCSV
- **エンコーディング**: UTF-8（BOM対応）、Shift-JIS
- **上限**: 5MB / 1,000行
- **方式**: All or Nothing（1行でもエラーがあれば全行ロールバック）
- **配列フィールド**: セミコロン`;`区切り

### マルチサロン管理

- Teamプランユーザーは複数サロンを登録可能
- サイドバーのSalonSelectorで対象サロンを切り替え
- コンテンツ生成は選択中のサロンに紐づく

### フロントエンドルート

| パス | ページ | 権限 |
|------|--------|------|
| `/team/salons` | サロン一覧 | Teamプラン |
| `/team/import` | CSV一括登録 | Teamプラン |
| `/team/members` | メンバー管理 | Teamプラン |

### 管理者CLI

`backend/cli/main.py` にClickベースのCLIを実装。組織作成・プラン割り当て・CSVインポートをコマンドラインから実行可能。

詳細: `docs/guides/team_plan_admin_guide.md`, `backend/cli/README.md`

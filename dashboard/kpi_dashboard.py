"""
HPB Content Studio — KPI ダッシュボード
Streamlit で主要KPIをリアルタイム可視化

起動: streamlit run dashboard/kpi_dashboard.py
"""
import os
import streamlit as st
import pandas as pd
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# .env 読み込み（ルート優先、なければ backend/.env）
for env_path in [".env", "backend/.env"]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)
        break

# ─── Supabase 接続 ───
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


@st.cache_resource
def get_supabase():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def query_table(table: str, select: str = "*", order: str = None, limit: int = None):
    """Supabase テーブルから取得"""
    client = get_supabase()
    if not client:
        return pd.DataFrame()
    q = client.table(table).select(select)
    if order:
        q = q.order(order, desc=True)
    if limit:
        q = q.limit(limit)
    res = q.execute()
    return pd.DataFrame(res.data) if res.data else pd.DataFrame()


def get_auth_users():
    """Supabase Auth からユーザー一覧を取得"""
    client = get_supabase()
    if not client:
        return []
    try:
        return client.auth.admin.list_users()
    except Exception:
        return []


# ─── ページ設定 ───
st.set_page_config(
    page_title="HPB Content Studio — KPI",
    page_icon="📊",
    layout="wide",
)

st.title("📊 HPB Content Studio — KPI ダッシュボード")

# 接続チェック
if not get_supabase():
    st.error(
        "⚠️ Supabase に接続できません。\n\n"
        "`.env` に以下を設定してください:\n"
        "```\nSUPABASE_URL=https://xxxxx.supabase.co\n"
        "SUPABASE_SERVICE_ROLE_KEY=eyJ...\n```"
    )
    st.info("💡 Supabase ダッシュボード → Settings → API からコピーできます")
    st.stop()

# ─── データ取得 ───
with st.spinner("データ取得中..."):
    salons_df = query_table("salons", "id, name, created_at")
    stylists_df = query_table("stylists", "id, salon_id, name, created_at")
    contents_df = query_table(
        "generated_contents",
        "id, content_type, char_count, input_tokens, output_tokens, created_at",
    )
    usage_df = query_table(
        "usage_tracking",
        "user_id, year_month, text_generation_count, blog_generation_count, total_input_tokens, total_output_tokens",
    )
    users = get_auth_users()

# 日付変換
for df in [salons_df, stylists_df, contents_df]:
    if not df.empty and "created_at" in df.columns:
        df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")

# ─── ヘッダーメトリクス ───
st.markdown("---")
now = datetime.now(timezone.utc)
week_ago = now - timedelta(days=7)

total_users = len(users)
weekly_new_users = sum(
    1 for u in users
    if hasattr(u, "created_at") and u.created_at and u.created_at >= week_ago
)
total_salons = len(salons_df)
total_stylists = len(stylists_df)
total_generations = int(usage_df["text_generation_count"].sum()) if not usage_df.empty else 0
total_blogs = int(usage_df["blog_generation_count"].sum()) if not usage_df.empty else 0
total_chars = int(contents_df["char_count"].sum()) if not contents_df.empty and "char_count" in contents_df.columns else 0

col1, col2, col3, col4, col5, col6 = st.columns(6)
col1.metric("👤 総ユーザー数", total_users, f"+{weekly_new_users} 今週")
col2.metric("💈 登録サロン", total_salons)
col3.metric("✂️ スタイリスト", total_stylists)
col4.metric("📝 テキスト生成数", total_generations)
col5.metric("📰 ブログ生成数", total_blogs)
col6.metric("📄 生成文字数累計", f"{total_chars:,}")

# ─── トークン & コスト ───
st.markdown("---")
st.subheader("💰 トークン使用量 & コスト概算")

total_input_tokens = int(usage_df["total_input_tokens"].sum()) if not usage_df.empty and "total_input_tokens" in usage_df.columns else 0
total_output_tokens = int(usage_df["total_output_tokens"].sum()) if not usage_df.empty and "total_output_tokens" in usage_df.columns else 0

# Claude 4.5 Haiku の料金
input_cost = total_input_tokens / 1_000_000 * 0.80  # $0.80/1M
output_cost = total_output_tokens / 1_000_000 * 4.00  # $4.00/1M
total_cost_usd = input_cost + output_cost
total_cost_jpy = total_cost_usd * 150  # 概算レート

tc1, tc2, tc3, tc4 = st.columns(4)
tc1.metric("⬆️ Input Tokens", f"{total_input_tokens:,}")
tc2.metric("⬇️ Output Tokens", f"{total_output_tokens:,}")
tc3.metric("💵 コスト (USD)", f"${total_cost_usd:.4f}")
tc4.metric("💴 コスト (JPY概算)", f"¥{total_cost_jpy:.1f}")

# ─── コンテンツタイプ別 ───
st.markdown("---")
st.subheader("📊 コンテンツタイプ別生成数")

if not contents_df.empty and "content_type" in contents_df.columns:
    type_labels = {
        "salon_catch": "サロンキャッチ",
        "salon_intro": "サロン紹介文",
        "stylist_profile": "プロフィール",
        "blog_article": "ブログ記事",
        "review_reply": "口コミ返信",
        "consultation": "悩み相談",
        "google_review_reply": "Google口コミ返信",
    }
    type_counts = contents_df["content_type"].value_counts()
    type_counts.index = type_counts.index.map(lambda x: type_labels.get(x, x))
    st.bar_chart(type_counts)
else:
    st.info("まだコンテンツが生成されていません")

# ─── 日別生成数推移 ───
st.markdown("---")
st.subheader("📈 日別コンテンツ生成数")

if not contents_df.empty:
    daily = contents_df.set_index("created_at").resample("D").size()
    daily.name = "生成数"
    if len(daily) > 0:
        st.line_chart(daily)
    else:
        st.info("データなし")
else:
    st.info("まだコンテンツが生成されていません")

# ─── 月別利用量 ───
st.markdown("---")
st.subheader("📅 月別利用サマリー")

if not usage_df.empty:
    monthly = usage_df.groupby("year_month").agg({
        "user_id": "nunique",
        "text_generation_count": "sum",
        "blog_generation_count": "sum",
    }).rename(columns={
        "user_id": "アクティブユーザー",
        "text_generation_count": "テキスト生成",
        "blog_generation_count": "ブログ生成",
    }).sort_index()
    st.dataframe(monthly, use_container_width=True)
else:
    st.info("利用データなし")

# ─── 直近の生成コンテンツ ───
st.markdown("---")
st.subheader("🕐 直近の生成コンテンツ")

recent = query_table(
    "generated_contents",
    "content_type, char_count, input_tokens, output_tokens, created_at",
    order="created_at",
    limit=20,
)
if not recent.empty:
    recent["created_at"] = pd.to_datetime(recent["created_at"], errors="coerce")
    type_labels = {
        "salon_catch": "サロンキャッチ",
        "salon_intro": "サロン紹介文",
        "stylist_profile": "プロフィール",
        "blog_article": "ブログ記事",
        "review_reply": "口コミ返信",
        "consultation": "悩み相談",
        "google_review_reply": "Google口コミ返信",
    }
    recent["content_type"] = recent["content_type"].map(lambda x: type_labels.get(x, x))
    recent = recent.rename(columns={
        "content_type": "タイプ",
        "char_count": "文字数",
        "input_tokens": "入力トークン",
        "output_tokens": "出力トークン",
        "created_at": "生成日時",
    })
    st.dataframe(recent, use_container_width=True, hide_index=True)
else:
    st.info("まだコンテンツが生成されていません")

# ─── フッター ───
st.markdown("---")
st.caption(f"最終更新: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ｜ Claude 4.5 Haiku: Input $0.80/1M, Output $4.00/1M")

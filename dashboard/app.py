"""
HPB Content Studio — KPIダッシュボード
週次更新のシンプルなKPI可視化ツール
"""
import json
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

# ページ設定
st.set_page_config(
    page_title="HPB Content Studio KPI",
    page_icon="📊",
    layout="wide",
)

DATA_PATH = Path(__file__).parent / "data" / "kpi_weekly.json"


@st.cache_data(ttl=300)
def load_data() -> dict:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def metric_card(label: str, current: int | float, target: int | float, unit: str = ""):
    """KPIカードを表示"""
    progress = current / target if target > 0 else 0
    pct = min(progress * 100, 100)

    if progress >= 1.0:
        color = "#10b981"  # green
    elif progress >= 0.6:
        color = "#f59e0b"  # amber
    else:
        color = "#6b7280"  # gray

    display_current = f"{current:,.0f}" if isinstance(current, (int, float)) else str(current)
    display_target = f"{target:,.0f}" if isinstance(target, (int, float)) else str(target)

    st.markdown(f"**{label}**")
    st.markdown(f"### {unit}{display_current} / {unit}{display_target}")
    st.progress(min(progress, 1.0))
    st.caption(f"達成率: {pct:.1f}%")


def format_tokens(n: int | float) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}K"
    return str(int(n))


def build_trend_chart(df: pd.DataFrame, column: str, title: str, target: int | float | None = None) -> go.Figure:
    """週次トレンドチャートを生成"""
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=df["week"],
        y=df[column],
        mode="lines+markers",
        name="実績",
        line=dict(color="#6366f1", width=2),
        marker=dict(size=6),
    ))

    # 累計線
    cumulative = df[column].cumsum()
    fig.add_trace(go.Bar(
        x=df["week"],
        y=df[column],
        name="週次",
        marker_color="rgba(99, 102, 241, 0.3)",
    ))

    fig.add_trace(go.Scatter(
        x=df["week"],
        y=cumulative,
        mode="lines+markers",
        name="累計",
        line=dict(color="#f97316", width=2, dash="dot"),
        marker=dict(size=5),
        yaxis="y2",
    ))

    if target is not None:
        fig.add_hline(
            y=target,
            line_dash="dash",
            line_color="#ef4444",
            annotation_text=f"目標: {target:,.0f}",
            annotation_position="top right",
        )

    fig.update_layout(
        title=title,
        xaxis_title="週",
        yaxis_title="週次",
        yaxis2=dict(title="累計", overlaying="y", side="right"),
        height=350,
        margin=dict(l=40, r=40, t=50, b=40),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )

    return fig


def main():
    data = load_data()
    targets = data["targets"]
    weekly = data["weekly_data"]

    st.title("📊 HPB Content Studio — KPIダッシュボード")
    st.caption("テストマーケティング期間（2026年4〜6月）| 週次更新")

    if not weekly:
        st.info("まだデータがありません。`dashboard/data/kpi_weekly.json` にデータを追加してください。")
        return

    df = pd.DataFrame(weekly)

    # 累計値を計算
    totals = {
        "lp_pv": df["lp_pv"].sum(),
        "free_registrations": df["free_registrations"].sum(),
        "pro_conversions": df["pro_conversions"].sum(),
        "team_inquiries": df["team_inquiries"].sum(),
        "output_tokens": df["output_tokens"].sum(),
        "api_cost_yen": df["api_cost_yen"].sum(),
        "blog_posts": df["blog_posts"].sum(),
        "note_posts": df["note_posts"].sum(),
        "youtube_videos": df["youtube_videos"].sum(),
    }

    # --- KPIサマリーカード ---
    st.header("KPIサマリー（累計）")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        metric_card("LP累計PV", totals["lp_pv"], targets["lp_pv"])

    with col2:
        metric_card("Free登録数", totals["free_registrations"], targets["free_registrations"])

    with col3:
        metric_card("Pro転換", totals["pro_conversions"], targets["pro_conversions"])

    with col4:
        metric_card("Team問い合わせ", totals["team_inquiries"], targets["team_inquiries"])

    st.divider()

    # --- トークン・コスト ---
    st.header("AI利用指標")

    col_t1, col_t2 = st.columns(2)

    with col_t1:
        token_total = totals["output_tokens"]
        token_target = targets["output_tokens"]
        st.markdown("**累計出力トークン数**")
        st.markdown(f"### {format_tokens(token_total)} / {format_tokens(token_target)}")
        st.progress(min(token_total / token_target, 1.0) if token_target > 0 else 0)
        st.caption(f"達成率: {(token_total / token_target * 100) if token_target > 0 else 0:.1f}%")

    with col_t2:
        metric_card("累計API費", totals["api_cost_yen"], targets["api_cost_yen"], unit="¥")

    st.divider()

    # --- コンテンツ制作 ---
    st.header("コンテンツ制作")

    col_c1, col_c2, col_c3 = st.columns(3)

    with col_c1:
        metric_card("ブログ記事", totals["blog_posts"], targets["blog_posts"])

    with col_c2:
        metric_card("Note記事", totals["note_posts"], targets["note_posts"])

    with col_c3:
        metric_card("YouTube動画", totals["youtube_videos"], targets["youtube_videos"])

    st.divider()

    # --- 週次トレンドチャート ---
    st.header("週次トレンド")

    if len(df) >= 2:
        tab1, tab2, tab3, tab4 = st.tabs(["LP PV", "登録・転換", "出力トークン", "API費用"])

        with tab1:
            fig = build_trend_chart(df, "lp_pv", "LP PV（週次 / 累計）", targets["lp_pv"])
            st.plotly_chart(fig, use_container_width=True)

        with tab2:
            fig = go.Figure()
            fig.add_trace(go.Bar(x=df["week"], y=df["free_registrations"], name="Free登録", marker_color="#6366f1"))
            fig.add_trace(go.Bar(x=df["week"], y=df["pro_conversions"], name="Pro転換", marker_color="#f97316"))
            fig.update_layout(
                title="登録・転換（週次）", barmode="group",
                height=350, margin=dict(l=40, r=40, t=50, b=40),
            )
            st.plotly_chart(fig, use_container_width=True)

        with tab3:
            fig = build_trend_chart(df, "output_tokens", "出力トークン数（週次 / 累計）", targets["output_tokens"])
            st.plotly_chart(fig, use_container_width=True)

        with tab4:
            fig = build_trend_chart(df, "api_cost_yen", "API費用（週次 / 累計）", targets["api_cost_yen"])
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("トレンドチャートは2週目以降のデータから表示されます。")

    # --- 週次データテーブル ---
    with st.expander("📋 週次データ一覧"):
        display_df = df[[
            "week", "date_start", "date_end",
            "lp_pv", "free_registrations", "pro_conversions",
            "team_inquiries", "output_tokens", "api_cost_yen",
            "blog_posts", "note_posts", "youtube_videos", "notes",
        ]].copy()
        display_df.columns = [
            "週", "開始日", "終了日",
            "LP PV", "Free登録", "Pro転換",
            "Team問合", "出力トークン", "API費(¥)",
            "ブログ", "Note", "YouTube", "備考",
        ]
        st.dataframe(display_df, use_container_width=True, hide_index=True)

    # --- 月次サマリー ---
    if len(df) >= 4:
        with st.expander("📅 月次サマリー"):
            df["month"] = pd.to_datetime(df["date_start"]).dt.to_period("M").astype(str)
            monthly = df.groupby("month").agg({
                "lp_pv": "sum",
                "free_registrations": "sum",
                "pro_conversions": "sum",
                "output_tokens": "sum",
                "api_cost_yen": "sum",
            }).reset_index()

            monthly_targets = data.get("monthly_targets", {})
            for _, row in monthly.iterrows():
                month_key = row["month"]
                mt = monthly_targets.get(month_key, {})
                st.subheader(f"{month_key}")
                cols = st.columns(5)
                metrics = [
                    ("LP PV", "lp_pv", ""),
                    ("Free登録", "free_registrations", ""),
                    ("Pro転換", "pro_conversions", ""),
                    ("出力トークン", "output_tokens", ""),
                    ("API費", "api_cost_yen", "¥"),
                ]
                for col, (label, key, unit) in zip(cols, metrics):
                    actual = row[key]
                    target = mt.get(key, 0)
                    with col:
                        if target > 0:
                            pct = actual / target * 100
                            delta_str = f"{pct:.0f}% (目標: {unit}{target:,.0f})"
                        else:
                            delta_str = "目標未設定"
                        display_val = f"{unit}{actual:,.0f}" if key != "output_tokens" else format_tokens(actual)
                        st.metric(label, display_val, delta_str)

    # --- データ更新ガイド ---
    with st.expander("ℹ️ データの更新方法"):
        st.markdown("""
### 週次データの更新手順

1. `dashboard/data/kpi_weekly.json` を開く
2. `weekly_data` 配列に新しい週のエントリを追加:

```json
{
  "week": "2026-W15",
  "date_start": "2026-04-08",
  "date_end": "2026-04-14",
  "lp_pv": 85,
  "free_registrations": 2,
  "pro_conversions": 0,
  "team_inquiries": 0,
  "output_tokens": 35000,
  "api_cost_yen": 35,
  "blog_posts": 1,
  "note_posts": 0,
  "youtube_videos": 0,
  "notes": "初週の実績"
}
```

3. ファイルを保存してダッシュボードをリロード

### データソース
| 指標 | 取得先 |
|------|--------|
| LP PV | Google Analytics 4 |
| Free登録 / Pro転換 | Supabase DB |
| 出力トークン / API費 | [Claude API Dashboard](https://console.anthropic.com/) |
| コンテンツ数 | 手動カウント |
""")


if __name__ == "__main__":
    main()

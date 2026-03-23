"""
統計データ生成CLIコマンド
"""
import asyncio
import json
import os
import click
from app.db.session import SessionLocal
from app.services.stats_service import get_public_stats


@click.group()
def stats():
    """統計データ管理コマンド"""
    pass


@stats.command()
@click.option("--output", default=None, help="出力先パス（指定しない場合はlp/とfrontend/public/の両方）")
def generate(output):
    """stats.jsonを生成・更新"""
    db = SessionLocal()
    try:
        data = asyncio.run(get_public_stats(db))
        json_str = json.dumps(data, ensure_ascii=False, indent=2)

        # プロジェクトルート（backend/cli/commands/ → backend/ → プロジェクトルート）
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        project_root = os.path.dirname(backend_dir)

        if output:
            # 指定パスのみ
            targets = [output]
        else:
            # デフォルト: lp/ と frontend/public/ の両方
            targets = [
                os.path.join(project_root, "lp", "stats.json"),
                os.path.join(project_root, "frontend", "public", "stats.json"),
            ]

        for path in targets:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(json_str + "\n")
            click.echo(f"  -> {path}")

        click.echo(f"\n統計データを生成しました:")
        click.echo(f"  登録サロン数: {data['registered_salons']}")
        click.echo(f"  累計トークン数: {data['total_tokens']:,}")
        click.echo(f"  今週の新規登録: {data['weekly_signups']}")
        click.echo(f"  最終更新: {data['last_updated']}")

    finally:
        db.close()

"""
CSV一括登録CLIコマンド
"""
import asyncio
import click
from app.db.session import SessionLocal
from app.services import csv_import_service


@click.group()
def import_csv():
    """CSV一括登録コマンド"""
    pass


@import_csv.command()
@click.option("--org-id", required=True, help="組織ID")
@click.option("--file", "file_path", required=True, type=click.Path(exists=True), help="CSVファイルパス")
@click.option("--user-email", default=None, help="実行ユーザーのメールアドレス（省略時はオーナー）")
def salons(org_id, file_path, user_email):
    """サロンCSVをインポート"""
    db = SessionLocal()
    try:
        from app.config import get_settings
        settings = get_settings()

        # ユーザーIDを解決
        if user_email:
            if settings.mock_auth:
                user_id = f"user-{user_email.replace('@', '-').replace('.', '-')}"
            else:
                from app.dependencies import get_supabase_client
                supabase = get_supabase_client()
                users = supabase.auth.admin.list_users()
                target = next((u for u in users if u.email == user_email), None)
                if not target:
                    click.echo(f"エラー: ユーザー {user_email} が見つかりません", err=True)
                    return
                user_id = target.id
        else:
            # 組織のオーナーを使用
            from app.models.organization import Organization
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                click.echo(f"エラー: 組織 {org_id} が見つかりません", err=True)
                return
            user_id = org.owner_user_id

        # CSVファイル読み込み
        with open(file_path, "r", encoding="utf-8-sig") as f:
            content = f.read()

        import os
        file_name = os.path.basename(file_path)

        click.echo(f"サロンCSVインポートを開始します...")
        click.echo(f"  ファイル: {file_name}")
        click.echo(f"  組織ID: {org_id}")

        result = asyncio.run(
            csv_import_service.import_salons_csv(
                db=db,
                org_id=org_id,
                user_id=user_id,
                file_name=file_name,
                content=content,
            )
        )

        click.echo(f"\n結果:")
        click.echo(f"  ステータス: {result['status']}")
        click.echo(f"  全行数: {result['total_rows']}")
        click.echo(f"  成功: {result['success_count']}")
        click.echo(f"  失敗: {result['error_count']}")

        if result["error_details"]:
            click.echo(f"\nエラー詳細:")
            for err in result["error_details"]:
                click.echo(f"  行{err['row']}: [{err['field']}] {err['message']}")

    finally:
        db.close()


@import_csv.command()
@click.option("--org-id", required=True, help="組織ID")
@click.option("--file", "file_path", required=True, type=click.Path(exists=True), help="CSVファイルパス")
@click.option("--user-email", default=None, help="実行ユーザーのメールアドレス（省略時はオーナー）")
def stylists(org_id, file_path, user_email):
    """スタイリストCSVをインポート"""
    db = SessionLocal()
    try:
        from app.config import get_settings
        settings = get_settings()

        if user_email:
            if settings.mock_auth:
                user_id = f"user-{user_email.replace('@', '-').replace('.', '-')}"
            else:
                from app.dependencies import get_supabase_client
                supabase = get_supabase_client()
                users = supabase.auth.admin.list_users()
                target = next((u for u in users if u.email == user_email), None)
                if not target:
                    click.echo(f"エラー: ユーザー {user_email} が見つかりません", err=True)
                    return
                user_id = target.id
        else:
            from app.models.organization import Organization
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                click.echo(f"エラー: 組織 {org_id} が見つかりません", err=True)
                return
            user_id = org.owner_user_id

        with open(file_path, "r", encoding="utf-8-sig") as f:
            content = f.read()

        import os
        file_name = os.path.basename(file_path)

        click.echo(f"スタイリストCSVインポートを開始します...")
        click.echo(f"  ファイル: {file_name}")
        click.echo(f"  組織ID: {org_id}")

        result = asyncio.run(
            csv_import_service.import_stylists_csv(
                db=db,
                org_id=org_id,
                user_id=user_id,
                file_name=file_name,
                content=content,
            )
        )

        click.echo(f"\n結果:")
        click.echo(f"  ステータス: {result['status']}")
        click.echo(f"  全行数: {result['total_rows']}")
        click.echo(f"  成功: {result['success_count']}")
        click.echo(f"  失敗: {result['error_count']}")

        if result["error_details"]:
            click.echo(f"\nエラー詳細:")
            for err in result["error_details"]:
                click.echo(f"  行{err['row']}: [{err['field']}] {err['message']}")

    finally:
        db.close()

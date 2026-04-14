"""
プラン管理CLIコマンド
"""
import asyncio
import click
from app.db.session import SessionLocal
from app.models.usage import Subscription
from app.services.usage_service import get_user_plan


@click.group()
def plan():
    """プラン管理コマンド"""
    pass


@plan.command(name="set-team")
@click.option("--user-email", required=True, help="ユーザーのメールアドレス")
@click.option("--org-id", required=True, help="組織ID")
def set_team(user_email, org_id):
    """ユーザーにTeamプランを割り当て"""
    db = SessionLocal()
    try:
        from app.config import get_settings
        settings = get_settings()

        if settings.mock_auth:
            user_id = f"user-{user_email.replace('@', '-').replace('.', '-')}"
        else:
            from app.dependencies import get_supabase_client
            supabase = get_supabase_client()
            users = supabase.auth.admin.list_users()
            target = None
            for u in users:
                if u.email == user_email:
                    target = u
                    break
            if not target:
                click.echo(f"エラー: ユーザー {user_email} が見つかりません", err=True)
                return
            user_id = target.id

        # 既存のサブスクリプションを確認
        existing = db.query(Subscription).filter(
            Subscription.user_id == user_id,
        ).first()

        if existing:
            existing.plan = "team"
            existing.status = "active"
            existing.organization_id = org_id
            click.echo(f"既存のサブスクリプションをTeamプランに更新しました")
        else:
            sub = Subscription(
                user_id=user_id,
                plan="team",
                status="active",
                organization_id=org_id,
            )
            db.add(sub)
            click.echo(f"Teamプランのサブスクリプションを作成しました")

        db.commit()
        click.echo(f"  ユーザー: {user_email} ({user_id})")
        click.echo(f"  組織ID: {org_id}")

    finally:
        db.close()


@plan.command(name="set-pro")
@click.option("--user-email", required=True, help="ユーザーのメールアドレス")
def set_pro(user_email):
    """ユーザーにProプランを手動付与"""
    db = SessionLocal()
    try:
        from app.config import get_settings
        settings = get_settings()

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

        existing = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if existing:
            existing.plan = "pro"
            existing.status = "active"
            existing.organization_id = None
            click.echo("既存のサブスクリプションをProプランに更新しました")
        else:
            db.add(Subscription(user_id=user_id, plan="pro", status="active"))
            click.echo("Proプランのサブスクリプションを作成しました")

        db.commit()
        click.echo(f"  ユーザー: {user_email} ({user_id})")

    finally:
        db.close()


@plan.command()
@click.option("--user-email", required=True, help="ユーザーのメールアドレス")
def revoke(user_email):
    """ユーザーのプランをFreeに戻す"""
    db = SessionLocal()
    try:
        from app.config import get_settings
        settings = get_settings()

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

        existing = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if existing:
            existing.plan = "free"
            existing.status = "active"
            existing.organization_id = None
            db.commit()
            click.echo(f"Freeプランに戻しました")
            click.echo(f"  ユーザー: {user_email} ({user_id})")
        else:
            click.echo(f"サブスクリプションが見つかりません（すでにFreeです）")

    finally:
        db.close()


@plan.command()
@click.option("--user-email", required=True, help="ユーザーのメールアドレス")
def info(user_email):
    """ユーザーのプラン情報を表示"""
    db = SessionLocal()
    try:
        from app.config import get_settings
        settings = get_settings()

        if settings.mock_auth:
            user_id = f"user-{user_email.replace('@', '-').replace('.', '-')}"
        else:
            from app.dependencies import get_supabase_client
            supabase = get_supabase_client()
            users = supabase.auth.admin.list_users()
            target = None
            for u in users:
                if u.email == user_email:
                    target = u
                    break
            if not target:
                click.echo(f"エラー: ユーザー {user_email} が見つかりません", err=True)
                return
            user_id = target.id

        current_plan = asyncio.run(get_user_plan(db, user_id))
        click.echo(f"プラン情報:")
        click.echo(f"  ユーザー: {user_email} ({user_id})")
        click.echo(f"  プラン: {current_plan}")

    finally:
        db.close()

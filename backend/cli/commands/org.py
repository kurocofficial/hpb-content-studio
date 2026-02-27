"""
組織管理CLIコマンド
"""
import asyncio
import click
from app.db.session import SessionLocal
from app.services import organization_service


@click.group()
def org():
    """組織管理コマンド"""
    pass


@org.command()
@click.option("--name", required=True, help="組織名")
@click.option("--owner-email", required=True, help="オーナーのメールアドレス")
@click.option("--contact-email", default=None, help="連絡先メール")
@click.option("--contact-phone", default=None, help="連絡先電話番号")
@click.option("--notes", default=None, help="備考")
def create(name, owner_email, contact_email, contact_phone, notes):
    """組織を作成"""
    db = SessionLocal()
    try:
        # メールからユーザーIDを解決（開発用はダミー生成）
        from app.config import get_settings
        settings = get_settings()

        if settings.mock_auth:
            owner_user_id = f"user-{owner_email.replace('@', '-').replace('.', '-')}"
            click.echo(f"[Mock] ユーザーID: {owner_user_id}")
        else:
            from app.dependencies import get_supabase_client
            supabase = get_supabase_client()
            users = supabase.auth.admin.list_users()
            target = None
            for u in users:
                if u.email == owner_email:
                    target = u
                    break
            if not target:
                click.echo(f"エラー: ユーザー {owner_email} が見つかりません", err=True)
                return
            owner_user_id = target.id

        result = asyncio.run(
            organization_service.create_organization(
                db=db,
                name=name,
                owner_user_id=owner_user_id,
                contact_email=contact_email,
                contact_phone=contact_phone,
                notes=notes,
            )
        )

        click.echo(f"組織を作成しました:")
        click.echo(f"  ID: {result['id']}")
        click.echo(f"  名前: {result['name']}")
        click.echo(f"  オーナー: {owner_email} ({owner_user_id})")

    finally:
        db.close()


@org.command(name="add-member")
@click.option("--org-id", required=True, help="組織ID")
@click.option("--email", required=True, help="メンバーのメールアドレス")
@click.option("--role", type=click.Choice(["admin", "member"]), default="member", help="ロール")
def add_member(org_id, email, role):
    """組織にメンバーを追加"""
    db = SessionLocal()
    try:
        from app.config import get_settings
        settings = get_settings()

        if settings.mock_auth:
            user_id = f"user-{email.replace('@', '-').replace('.', '-')}"
        else:
            from app.dependencies import get_supabase_client
            supabase = get_supabase_client()
            users = supabase.auth.admin.list_users()
            target = None
            for u in users:
                if u.email == email:
                    target = u
                    break
            if not target:
                click.echo(f"エラー: ユーザー {email} が見つかりません", err=True)
                return
            user_id = target.id

        result = asyncio.run(
            organization_service.add_member(db, org_id, user_id, role)
        )

        click.echo(f"メンバーを追加しました:")
        click.echo(f"  ユーザー: {email} ({user_id})")
        click.echo(f"  ロール: {role}")

    except ValueError as e:
        click.echo(f"エラー: {e}", err=True)
    finally:
        db.close()


@org.command(name="list-members")
@click.option("--org-id", required=True, help="組織ID")
def list_members(org_id):
    """組織のメンバー一覧"""
    db = SessionLocal()
    try:
        members = asyncio.run(organization_service.get_org_members(db, org_id))
        if not members:
            click.echo("メンバーが見つかりません")
            return

        click.echo(f"メンバー一覧 ({len(members)}名):")
        for m in members:
            click.echo(f"  - {m['user_id']} [{m['role']}]")

    finally:
        db.close()

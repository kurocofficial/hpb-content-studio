"""
組織管理サービス
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.organization import Organization, OrganizationMember
from app.models.salon import Salon


async def create_organization(
    db: Session,
    name: str,
    owner_user_id: str,
    contact_email: Optional[str] = None,
    contact_phone: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    組織を作成し、ownerをメンバーに追加
    """
    org = Organization(
        name=name,
        owner_user_id=owner_user_id,
        contact_email=contact_email,
        contact_phone=contact_phone,
        notes=notes,
    )
    db.add(org)
    db.flush()

    # ownerをメンバーとして追加
    member = OrganizationMember(
        organization_id=org.id,
        user_id=owner_user_id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(org)

    return org.to_dict()


async def get_user_organization(
    db: Session,
    user_id: str,
) -> Optional[Dict[str, Any]]:
    """
    ユーザーの所属組織を取得（最初に見つかったもの）
    """
    member = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user_id
    ).first()

    if not member:
        return None

    org = db.query(Organization).filter(
        Organization.id == member.organization_id
    ).first()

    if not org:
        return None

    result = org.to_dict()
    result["role"] = member.role
    return result


async def get_organization_by_id(
    db: Session,
    org_id: str,
) -> Optional[Dict[str, Any]]:
    """
    IDで組織を取得
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return None
    return org.to_dict()


async def update_organization(
    db: Session,
    org_id: str,
    **kwargs,
) -> Optional[Dict[str, Any]]:
    """
    組織情報を更新
    """
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return None

    for key, value in kwargs.items():
        if value is not None and hasattr(org, key):
            setattr(org, key, value)

    db.commit()
    db.refresh(org)
    return org.to_dict()


async def get_org_members(
    db: Session,
    org_id: str,
) -> List[Dict[str, Any]]:
    """
    組織のメンバー一覧を取得
    """
    members = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id
    ).order_by(OrganizationMember.created_at).all()

    return [m.to_dict() for m in members]


async def get_member_role(
    db: Session,
    org_id: str,
    user_id: str,
) -> Optional[str]:
    """
    ユーザーの組織内ロールを取得
    """
    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user_id,
    ).first()

    if not member:
        return None
    return member.role


async def add_member(
    db: Session,
    org_id: str,
    user_id: str,
    role: str = "member",
) -> Dict[str, Any]:
    """
    組織にメンバーを追加
    """
    # 既に所属しているかチェック
    existing = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user_id,
    ).first()

    if existing:
        raise ValueError("このユーザーは既に組織に所属しています")

    member = OrganizationMember(
        organization_id=org_id,
        user_id=user_id,
        role=role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return member.to_dict()


async def remove_member(
    db: Session,
    org_id: str,
    user_id: str,
) -> bool:
    """
    組織からメンバーを削除（ownerは削除不可）
    """
    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user_id,
    ).first()

    if not member:
        return False

    if member.role == "owner":
        raise ValueError("オーナーは削除できません")

    db.delete(member)
    db.commit()
    return True


async def get_org_salons(
    db: Session,
    org_id: str,
) -> List[Dict[str, Any]]:
    """
    組織配下のサロン一覧を取得
    """
    salons = db.query(Salon).filter(
        Salon.organization_id == org_id
    ).order_by(Salon.created_at).all()

    return [s.to_dict() for s in salons]

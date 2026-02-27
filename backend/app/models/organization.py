"""
Organization, OrganizationMember, CsvImportJob モデル
"""
import json
from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin, generate_uuid


class Organization(Base, TimestampMixin):
    """組織テーブル"""
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    owner_user_id = Column(String(36), nullable=False, index=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    max_salons = Column(Integer, nullable=True)  # NULL=無制限
    max_stylists_per_salon = Column(Integer, nullable=True)  # NULL=無制限

    # リレーション
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    salons = relationship("Salon", back_populates="organization")
    csv_import_jobs = relationship("CsvImportJob", back_populates="organization", cascade="all, delete-orphan")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": self.id,
            "name": self.name,
            "owner_user_id": self.owner_user_id,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "notes": self.notes,
            "max_salons": self.max_salons,
            "max_stylists_per_salon": self.max_stylists_per_salon,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class OrganizationMember(Base, TimestampMixin):
    """組織メンバーテーブル"""
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="member")  # owner, admin, member

    # リレーション
    organization = relationship("Organization", back_populates="members")

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "user_id": self.user_id,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CsvImportJob(Base, TimestampMixin):
    """CSVインポートジョブテーブル"""
    __tablename__ = "csv_import_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), nullable=False)
    import_type = Column(String(20), nullable=False)  # salons, stylists
    file_name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending, processing, completed, failed
    total_rows = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    error_details = Column(Text, default="[]")  # JSON文字列（SQLite互換）

    # リレーション
    organization = relationship("Organization", back_populates="csv_import_jobs")

    def get_error_details(self):
        """エラー詳細をリストとして取得"""
        if not self.error_details:
            return []
        try:
            return json.loads(self.error_details)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_error_details(self, errors: list):
        """エラー詳細をJSON文字列として保存"""
        self.error_details = json.dumps(errors, ensure_ascii=False)

    def to_dict(self):
        """辞書に変換"""
        return {
            "id": self.id,
            "organization_id": self.organization_id,
            "user_id": self.user_id,
            "import_type": self.import_type,
            "file_name": self.file_name,
            "status": self.status,
            "total_rows": self.total_rows,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "error_details": self.get_error_details(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

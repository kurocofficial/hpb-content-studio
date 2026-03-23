"""
CSV一括登録サービス
"""
import csv
import io
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.config import get_settings
from app.models.organization import CsvImportJob
from app.models.salon import Salon
from app.models.stylist import Stylist
from app.schemas.csv_import import SalonCsvRow, StylistCsvRow

SALON_REQUIRED_HEADERS = {"name", "area"}
STYLIST_REQUIRED_HEADERS = {"salon_name", "name"}


def _parse_csv_content(content: str) -> Tuple[List[str], List[Dict[str, str]]]:
    """
    CSV文字列をパースしてヘッダーと行データを返す
    BOM対応
    """
    # BOM除去
    if content.startswith("\ufeff"):
        content = content[1:]

    reader = csv.DictReader(io.StringIO(content))
    headers = reader.fieldnames or []
    rows = list(reader)
    return headers, rows


def _validate_headers(headers: List[str], required: set) -> List[Dict[str, Any]]:
    """必須ヘッダーの存在確認"""
    errors = []
    missing = required - set(headers)
    if missing:
        errors.append({
            "row": 0,
            "field": ", ".join(missing),
            "message": f"必須カラムが見つかりません: {', '.join(missing)}",
        })
    return errors


async def import_salons_csv(
    db: Session,
    org_id: str,
    user_id: str,
    file_name: str,
    content: str,
) -> Dict[str, Any]:
    """
    サロンCSVをインポート（All or Nothing）
    """
    settings = get_settings()

    # ジョブレコード作成
    job = CsvImportJob(
        organization_id=org_id,
        user_id=user_id,
        import_type="salons",
        file_name=file_name,
        status="processing",
    )
    db.add(job)
    db.flush()

    try:
        # ファイルサイズチェック
        if len(content.encode("utf-8")) > settings.csv_max_file_size_mb * 1024 * 1024:
            raise ValueError(f"ファイルサイズが{settings.csv_max_file_size_mb}MBを超えています")

        # CSVパース
        headers, rows = _parse_csv_content(content)

        # ヘッダーチェック
        header_errors = _validate_headers(headers, SALON_REQUIRED_HEADERS)
        if header_errors:
            job.status = "failed"
            job.error_count = len(header_errors)
            job.set_error_details(header_errors)
            db.commit()
            return job.to_dict()

        # 行数チェック
        if len(rows) > settings.csv_max_rows:
            job.status = "failed"
            job.error_count = 1
            job.set_error_details([{
                "row": 0,
                "field": "",
                "message": f"行数が上限({settings.csv_max_rows}行)を超えています（{len(rows)}行）",
            }])
            db.commit()
            return job.to_dict()

        job.total_rows = len(rows)
        errors = []
        validated_rows = []

        # 行ごとにバリデーション
        for i, row in enumerate(rows, start=2):  # CSVの2行目から（1行目はヘッダー）
            try:
                validated = SalonCsvRow(**{k: v for k, v in row.items() if v})
                validated_rows.append(validated)
            except ValidationError as e:
                for err in e.errors():
                    errors.append({
                        "row": i,
                        "field": err["loc"][-1] if err["loc"] else "",
                        "message": err["msg"],
                    })

        # エラーがあれば全行ロールバック
        if errors:
            job.status = "failed"
            job.error_count = len(errors)
            job.set_error_details(errors)
            db.commit()
            return job.to_dict()

        # バルクINSERT
        for validated in validated_rows:
            salon = Salon(
                user_id=user_id,
                organization_id=org_id,
                name=validated.name,
                area=validated.area,
                concept=validated.concept,
                target_customer=validated.target_customer,
                strength=validated.strength,
            )
            db.add(salon)

        job.status = "completed"
        job.success_count = len(validated_rows)
        db.commit()

        return job.to_dict()

    except ValueError as e:
        job.status = "failed"
        job.error_count = 1
        job.set_error_details([{"row": 0, "field": "", "message": str(e)}])
        db.commit()
        return job.to_dict()
    except Exception as e:
        db.rollback()
        job.status = "failed"
        job.error_count = 1
        job.set_error_details([{"row": 0, "field": "", "message": f"予期しないエラー: {str(e)}"}])
        db.add(job)
        db.commit()
        return job.to_dict()


async def import_stylists_csv(
    db: Session,
    org_id: str,
    user_id: str,
    file_name: str,
    content: str,
) -> Dict[str, Any]:
    """
    スタイリストCSVをインポート（All or Nothing）
    salon_name → 組織配下のsalon_idに照合
    """
    settings = get_settings()

    # ジョブレコード作成
    job = CsvImportJob(
        organization_id=org_id,
        user_id=user_id,
        import_type="stylists",
        file_name=file_name,
        status="processing",
    )
    db.add(job)
    db.flush()

    try:
        # ファイルサイズチェック
        if len(content.encode("utf-8")) > settings.csv_max_file_size_mb * 1024 * 1024:
            raise ValueError(f"ファイルサイズが{settings.csv_max_file_size_mb}MBを超えています")

        # CSVパース
        headers, rows = _parse_csv_content(content)

        # ヘッダーチェック
        header_errors = _validate_headers(headers, STYLIST_REQUIRED_HEADERS)
        if header_errors:
            job.status = "failed"
            job.error_count = len(header_errors)
            job.set_error_details(header_errors)
            db.commit()
            return job.to_dict()

        # 行数チェック
        if len(rows) > settings.csv_max_rows:
            job.status = "failed"
            job.error_count = 1
            job.set_error_details([{
                "row": 0,
                "field": "",
                "message": f"行数が上限({settings.csv_max_rows}行)を超えています（{len(rows)}行）",
            }])
            db.commit()
            return job.to_dict()

        job.total_rows = len(rows)

        # 組織配下のサロン名→IDマッピング
        org_salons = db.query(Salon).filter(Salon.organization_id == org_id).all()
        salon_name_to_id = {s.name: s.id for s in org_salons}

        errors = []
        validated_rows = []

        for i, row in enumerate(rows, start=2):
            try:
                validated = StylistCsvRow(**{k: v for k, v in row.items() if v})

                # salon_name → salon_id 照合
                salon_id = salon_name_to_id.get(validated.salon_name)
                if not salon_id:
                    errors.append({
                        "row": i,
                        "field": "salon_name",
                        "message": f"サロン「{validated.salon_name}」が組織内に見つかりません",
                    })
                    continue

                validated_rows.append((validated, salon_id))

            except ValidationError as e:
                for err in e.errors():
                    errors.append({
                        "row": i,
                        "field": err["loc"][-1] if err["loc"] else "",
                        "message": err["msg"],
                    })

        # エラーがあれば全行ロールバック
        if errors:
            job.status = "failed"
            job.error_count = len(errors)
            job.set_error_details(errors)
            db.commit()
            return job.to_dict()

        # バルクINSERT
        for validated, salon_id in validated_rows:
            stylist = Stylist(
                salon_id=salon_id,
                name=validated.name,
                role=validated.role,
                years_experience=validated.years_experience,
                specialties=validated.parse_specialties(),
                style_features=validated.parse_style_features(),
                personality=validated.personality,
                writing_style=validated.to_writing_style(),
                language_style=validated.to_language_style(),
                background=validated.to_background(),
                service_info=validated.to_service_info(),
            )
            db.add(stylist)

        job.status = "completed"
        job.success_count = len(validated_rows)
        db.commit()

        return job.to_dict()

    except ValueError as e:
        job.status = "failed"
        job.error_count = 1
        job.set_error_details([{"row": 0, "field": "", "message": str(e)}])
        db.commit()
        return job.to_dict()
    except Exception as e:
        db.rollback()
        job.status = "failed"
        job.error_count = 1
        job.set_error_details([{"row": 0, "field": "", "message": f"予期しないエラー: {str(e)}"}])
        db.add(job)
        db.commit()
        return job.to_dict()


async def get_import_jobs(
    db: Session,
    org_id: str,
) -> List[Dict[str, Any]]:
    """インポートジョブ一覧を取得"""
    jobs = db.query(CsvImportJob).filter(
        CsvImportJob.organization_id == org_id
    ).order_by(CsvImportJob.created_at.desc()).all()

    return [j.to_dict() for j in jobs]


async def get_import_job(
    db: Session,
    job_id: str,
) -> Dict[str, Any]:
    """インポートジョブ詳細を取得"""
    job = db.query(CsvImportJob).filter(CsvImportJob.id == job_id).first()
    if not job:
        return None
    return job.to_dict()

"""
CSV一括登録のエンドポイント
"""
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_org_admin
from app.schemas.organization import CsvImportJobResponse, CsvImportJobListResponse
from app.services import csv_import_service

router = APIRouter()


@router.post("/{org_id}/import/salons", response_model=CsvImportJobResponse)
async def import_salons(
    org_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """サロンCSVインポート（owner/admin）"""
    await require_org_admin(org_id, current_user, db)

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSVファイルをアップロードしてください",
        )

    content = await file.read()
    try:
        content_str = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            content_str = content.decode("shift_jis")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ファイルのエンコーディングがUTF-8またはShift-JISではありません",
            )

    result = await csv_import_service.import_salons_csv(
        db=db,
        org_id=org_id,
        user_id=current_user["id"],
        file_name=file.filename,
        content=content_str,
    )

    return CsvImportJobResponse(**result)


@router.post("/{org_id}/import/stylists", response_model=CsvImportJobResponse)
async def import_stylists(
    org_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """スタイリストCSVインポート（owner/admin）"""
    await require_org_admin(org_id, current_user, db)

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSVファイルをアップロードしてください",
        )

    content = await file.read()
    try:
        content_str = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            content_str = content.decode("shift_jis")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ファイルのエンコーディングがUTF-8またはShift-JISではありません",
            )

    result = await csv_import_service.import_stylists_csv(
        db=db,
        org_id=org_id,
        user_id=current_user["id"],
        file_name=file.filename,
        content=content_str,
    )

    return CsvImportJobResponse(**result)


@router.get("/{org_id}/import/jobs", response_model=CsvImportJobListResponse)
async def list_import_jobs(
    org_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """インポートジョブ一覧"""
    from app.services.organization_service import get_member_role
    role = await get_member_role(db, org_id, current_user["id"])
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この組織のメンバーではありません",
        )

    jobs = await csv_import_service.get_import_jobs(db, org_id)
    return CsvImportJobListResponse(
        items=[CsvImportJobResponse(**j) for j in jobs],
        total=len(jobs),
    )


@router.get("/{org_id}/import/jobs/{job_id}", response_model=CsvImportJobResponse)
async def get_import_job(
    org_id: str,
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """インポートジョブ詳細"""
    from app.services.organization_service import get_member_role
    role = await get_member_role(db, org_id, current_user["id"])
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この組織のメンバーではありません",
        )

    job = await csv_import_service.get_import_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ジョブが見つかりません",
        )

    return CsvImportJobResponse(**job)


@router.get("/templates/salons")
async def download_salon_template():
    """サロンCSVテンプレートをダウンロード"""
    template_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "templates", "csv", "salons_template.csv"
    )
    if not os.path.exists(template_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="テンプレートファイルが見つかりません",
        )
    return FileResponse(
        template_path,
        media_type="text/csv",
        filename="salons_template.csv",
    )


@router.get("/templates/stylists")
async def download_stylist_template():
    """スタイリストCSVテンプレートをダウンロード"""
    template_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "templates", "csv", "stylists_template.csv"
    )
    if not os.path.exists(template_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="テンプレートファイルが見つかりません",
        )
    return FileResponse(
        template_path,
        media_type="text/csv",
        filename="stylists_template.csv",
    )

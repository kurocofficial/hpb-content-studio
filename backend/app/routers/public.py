"""
公開情報エンドポイント（認証不要）
"""
import time
from typing import Dict, Any, Optional, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.services.stats_service import get_public_stats

router = APIRouter()

# インメモリTTLキャッシュ（5分）
_cache: Optional[Tuple[float, Dict[str, Any]]] = None
_CACHE_TTL = 300  # 5分


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """公開統計情報（認証不要）"""
    global _cache

    now = time.time()
    if _cache and (now - _cache[0]) < _CACHE_TTL:
        return _cache[1]

    data = await get_public_stats(db)
    _cache = (now, data)
    return data

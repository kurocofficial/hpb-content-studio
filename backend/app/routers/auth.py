"""
認証関連のエンドポイント
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_supabase_client, get_current_user
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    MessageResponse,
)
from app.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """
    新規ユーザー登録
    """
    # モックモードの場合はダミーレスポンスを返す
    if settings.mock_auth:
        return AuthResponse(
            user_id=settings.mock_user_id,
            email=request.email,
            access_token="mock-access-token-for-development",
            token_type="bearer"
        )

    supabase = get_supabase_client()
    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
        })

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="アカウント作成に失敗しました"
            )

        return AuthResponse(
            user_id=response.user.id,
            email=response.user.email or "",
            access_token=response.session.access_token if response.session else "",
            token_type="bearer"
        )

    except Exception as e:
        error_message = str(e)
        if "User already registered" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に登録されています"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"アカウント作成に失敗しました: {error_message}"
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    ログイン
    """
    # モックモードの場合はダミーレスポンスを返す
    if settings.mock_auth:
        return AuthResponse(
            user_id=settings.mock_user_id,
            email=request.email,
            access_token="mock-access-token-for-development",
            token_type="bearer"
        )

    supabase = get_supabase_client()
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="メールアドレスまたはパスワードが正しくありません"
            )

        return AuthResponse(
            user_id=response.user.id,
            email=response.user.email or "",
            access_token=response.session.access_token,
            token_type="bearer"
        )

    except Exception as e:
        error_message = str(e)
        if "Invalid login credentials" in error_message:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="メールアドレスまたはパスワードが正しくありません"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ログインに失敗しました"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    ログアウト
    """
    # モックモードの場合は即座に成功
    if settings.mock_auth:
        return MessageResponse(message="ログアウトしました")

    supabase = get_supabase_client()
    try:
        supabase.auth.sign_out()
        return MessageResponse(message="ログアウトしました")
    except Exception:
        # ログアウトは失敗しても問題ない
        return MessageResponse(message="ログアウトしました")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """
    現在のユーザー情報を取得
    """
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        created_at=current_user["created_at"]
    )

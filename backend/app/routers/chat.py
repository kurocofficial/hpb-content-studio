"""
チャット修正エンドポイント
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse,
)
from app.models.salon import Salon
from app.models.content import GeneratedContent
from app.models.chat import ChatSession, ChatMessage
from app.services.content_service import modify_content_with_chat
from app.services.usage_service import get_user_plan
from app.config import get_settings
from app.utils.char_counter import count_hpb_characters

router = APIRouter()
settings = get_settings()


def get_user_salon_id(db: Session, user_id: str) -> str:
    """ユーザーのサロンIDを取得"""
    salon = db.query(Salon).filter(Salon.user_id == user_id).first()
    if not salon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="サロンが登録されていません"
        )
    return salon.id


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    request: ChatSessionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    チャットセッションを作成
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # コンテンツの所有権チェック
    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == request.content_id,
        GeneratedContent.salon_id == salon_id
    ).first()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )

    # 既存のセッションがあるかチェック
    existing = db.query(ChatSession).filter(
        ChatSession.content_id == request.content_id
    ).first()

    if existing:
        return ChatSessionResponse(**existing.to_dict())

    # 新規セッション作成
    session = ChatSession(
        content_id=request.content_id,
        turn_count=0,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return ChatSessionResponse(**session.to_dict())


@router.get("/sessions/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    チャット履歴を取得
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # セッションを取得
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="セッションが見つかりません"
        )

    # コンテンツの所有権チェック
    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == session.content_id,
        GeneratedContent.salon_id == salon_id
    ).first()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )

    # メッセージを取得
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()

    # プランに応じた制限チェック
    plan = await get_user_plan(db, current_user["id"])
    turn_count = session.turn_count or 0

    if plan == "pro":
        can_continue = True
        turns_remaining = None
    else:
        max_turns = settings.free_chat_turns_per_session
        can_continue = turn_count < max_turns
        turns_remaining = max(0, max_turns - turn_count)

    return ChatHistoryResponse(
        session=ChatSessionResponse(**session.to_dict()),
        messages=[ChatMessageResponse(**m.to_dict()) for m in messages],
        current_content=content.content,
        can_continue=can_continue,
        turns_remaining=turns_remaining,
    )


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    session_id: str,
    request: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    メッセージを送信してAI応答を取得
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # セッションを取得
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="セッションが見つかりません"
        )

    # コンテンツの所有権チェック
    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == session.content_id,
        GeneratedContent.salon_id == salon_id
    ).first()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )

    # プランに応じた制限チェック
    plan = await get_user_plan(db, current_user["id"])
    turn_count = session.turn_count or 0

    if plan != "pro" and turn_count >= settings.free_chat_turns_per_session:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"チャット回数上限（{settings.free_chat_turns_per_session}回）に達しました。Proプランにアップグレードすると無制限で利用できます。"
        )

    # ユーザーメッセージを保存
    user_message = ChatMessage(
        session_id=session_id,
        role="user",
        content=request.message,
    )
    db.add(user_message)
    db.commit()

    # AI応答を生成
    try:
        modified_content = await modify_content_with_chat(
            db=db,
            content_id=session.content_id,
            user_instruction=request.message,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"応答の生成に失敗しました: {str(e)}"
        )

    # AI応答を保存
    assistant_message = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=modified_content,
    )
    db.add(assistant_message)

    # コンテンツを更新
    content.content = modified_content
    content.char_count = count_hpb_characters(modified_content)

    # ターンカウントを更新
    session.turn_count = turn_count + 1

    db.commit()
    db.refresh(assistant_message)

    return ChatMessageResponse(**assistant_message.to_dict())


@router.post("/sessions/{session_id}/confirm")
async def confirm_content(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    コンテンツを確定（セッション終了）
    """
    salon_id = get_user_salon_id(db, current_user["id"])

    # セッションを取得
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="セッションが見つかりません"
        )

    # コンテンツの所有権チェック
    content = db.query(GeneratedContent).filter(
        GeneratedContent.id == session.content_id,
        GeneratedContent.salon_id == salon_id
    ).first()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )

    return {
        "message": "コンテンツを確定しました",
        "content_id": session.content_id,
        "content": content.content,
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db, SessionLocal
from app.schemas.schemas import ChatRequest, ChatResponse, ChatSessionCreate, ChatSessionResponse
from app.db.models import ChatMessage, KnowledgeBase, ChatSession
from app.services.rag_service import rag_engine
from app.core.config import settings
from app.core.security import get_current_user_id
import os
from groq import Groq

router = APIRouter(prefix="/chat", tags=["chat"])
client = Groq(api_key=settings.GROQ_API_KEY)


# --- Auto Seed Logic ---
def auto_seed():
    db = SessionLocal()
    try:
        count = db.query(KnowledgeBase).count()
        if count == 0:
            seeds = [
                KnowledgeBase(title="Pharma Premium Overview", category="Company",
                    content="Pharma Premium provides high-quality pharmaceutical guidance and healthcare information to patients and professionals."),
                KnowledgeBase(title="Prescription Assistance", category="Services",
                    content="We help patients understand their prescriptions, dosage instructions, and potential drug interactions."),
                KnowledgeBase(title="Healthcare Consultation", category="Services",
                    content="Our pharmacists are available for online consultation. Book a session at support@pharmapremium.com or call 0800 000 111."),
                KnowledgeBase(title="Contact Information", category="Company",
                    content="Reach our support team at support@pharmapremium.com or call 0800 000 111. Available Mon-Fri 9am-6pm."),
                KnowledgeBase(title="Medication Storage", category="Guidelines",
                    content="Most medications should be stored at room temperature (15-25°C), away from direct sunlight and moisture. Refrigerated items must be kept at 2-8°C."),
            ]
            db.add_all(seeds)
            db.commit()
            rag_engine.rebuild_index()
        else:
            if not os.path.exists(settings.INDEX_PATH):
                rag_engine.rebuild_index()
    except Exception as e:
        print(f"Auto-seed error: {e}")
    finally:
        db.close()


@router.post("/", response_model=ChatResponse)
async def chat_with_rag(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)   # Auth enforced
):
    # Verify session belongs to authenticated user
    session = db.query(ChatSession).filter(
        ChatSession.id == req.session_id,
        ChatSession.user_id == current_user_id
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="Session not found or access denied.")

    context_chunks = rag_engine.search(req.message, top_k=3)
    context_text = "\n\n".join([c["text"] for c in context_chunks])

    history = []
    h_entries = db.query(ChatMessage).filter(ChatMessage.session_id == req.session_id)\
                  .order_by(ChatMessage.created_at.desc()).limit(10).all()
    for h in reversed(h_entries):
        history.append({"role": h.role, "content": h.content})

    is_german = req.language == "de"
    lang_name = "German (Deutsch)" if is_german else "English"

    refusal_msg = (
        "Ich habe diese Informationen leider nicht in meiner Datenbank. Ich kann Ihnen jedoch bei Fragen zu unseren pharmazeutischen Dienstleistungen helfen."
        if is_german else
        "I'm sorry, I don't have that specific information in my database. However, I can help you with inquiries regarding our pharmaceutical services."
    )

    system_prompt = f"""You are a professional AI Assistant for "Pharma Premium".
Your goal is to answer user questions using ONLY the provided context.

CONTEXT:
{context_text if context_text else "EMPTY - NO DATA FOUND"}

STRICT INSTRUCTIONS:
- You MUST respond entirely in {lang_name}.
- If the CONTEXT is EMPTY or does not contain the answer, you MUST politely say: "{refusal_msg}"
- Do NOT use outside knowledge to answer service or price questions.
- If the user asks a general question NOT about pharmaceutical services, refuse politely in {lang_name}.
- Be concise, helpful, and professional.

At the very end of your response, provide exactly 3 short follow-up questions the user might ask next.
Format them exactly like this:
$$$ [Question 1] | [Question 2] | [Question 3]
"""

    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": req.message}]

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.1,
            max_tokens=1024
        )
        full_content = completion.choices[0].message.content

        if "$$$" in full_content:
            parts = full_content.split("$$$")
            bot_response = parts[0].strip()
            suggestions = [s.strip() for s in parts[1].strip().split("|") if s.strip()]
        else:
            bot_response = full_content.strip()
            suggestions = []

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")

    user_msg = ChatMessage(user_id=current_user_id, session_id=req.session_id, role="user", content=req.message)
    bot_msg = ChatMessage(user_id=current_user_id, session_id=req.session_id, role="assistant", content=bot_response)
    db.add(user_msg)
    db.add(bot_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(bot_msg)

    return {
        "response": bot_response,
        "user_msg_id": user_msg.id,
        "bot_msg_id": bot_msg.id,
        "suggestions": suggestions
    }


@router.get("/sessions/{user_id}", response_model=list[ChatSessionResponse])
async def list_sessions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return db.query(ChatSession).filter(ChatSession.user_id == current_user_id)\
             .order_by(ChatSession.created_at.desc()).all()


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    req: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    new_session = ChatSession(user_id=current_user_id, title=req.title)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/session/{session_id}/messages")
async def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user_id
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="Access denied.")
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id)\
             .order_by(ChatMessage.created_at.asc()).all()


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied.")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


@router.get("/history/{user_id}")
async def get_chat_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return db.query(ChatMessage).filter(ChatMessage.user_id == current_user_id)\
             .order_by(ChatMessage.created_at.asc()).all()


@router.get("/seed")
async def seed_knowledge_base(db: Session = Depends(get_db)):
    auto_seed()
    return {"message": "Seeded"}

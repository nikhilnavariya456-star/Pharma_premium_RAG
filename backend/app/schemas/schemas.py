from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True   #pydantic convert


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ChatRequest(BaseModel):
    user_id: Optional[int] = None
    session_id: int
    message: str
    language: str = "en"


class ChatSessionCreate(BaseModel):
    user_id: int
    title: Optional[str] = "New Chat"


class ChatSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    response: str
    user_msg_id: int
    bot_msg_id: int
    suggestions: list[str] = []

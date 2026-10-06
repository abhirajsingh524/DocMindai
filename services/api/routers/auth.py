from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.database import get_db
from services.api.models import User, Workspace, Membership
from services.api.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    get_current_workspace,
    get_or_create_default_user_and_workspace
)
from services.api.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = "DocMind Researcher"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    workspace: dict

class ApiKeyUpdate(BaseModel):
    api_key: str

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role="owner"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create workspace
    slug = req.email.split("@")[0].lower() + "-workspace"
    workspace = Workspace(
        name=f"{req.full_name}'s Workspace",
        slug=slug,
        owner_id=user.id
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)

    membership = Membership(
        user_id=user.id,
        workspace_id=workspace.id,
        role="owner"
    )
    db.add(membership)
    await db.commit()

    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
        "workspace": {"id": workspace.id, "name": workspace.name, "slug": workspace.slug}
    }

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    ws_result = await db.execute(
        select(Workspace)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .where(Membership.user_id == user.id)
    )
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        _, workspace = await get_or_create_default_user_and_workspace(db)

    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
        "workspace": {"id": workspace.id, "name": workspace.name, "slug": workspace.slug}
    }

@router.get("/me")
async def get_me(
    user: User = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace)
):
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        },
        "workspace": {
            "id": workspace.id,
            "name": workspace.name,
            "slug": workspace.slug
        },
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.APINEX_MODEL,
        "has_api_key": bool(settings.APINEX_API_KEY and settings.APINEX_API_KEY.strip())
    }

@router.post("/apikey")
async def update_api_key(
    req: ApiKeyUpdate,
    user: User = Depends(get_current_user)
):
    """
    Dynamically update APINEX API Key for current session/backend instance.
    """
    settings.APINEX_API_KEY = req.api_key.strip()
    from services.api.llm.apinex import apinex_client
    apinex_client.api_key = req.api_key.strip()
    return {"status": "success", "has_api_key": bool(settings.APINEX_API_KEY)}

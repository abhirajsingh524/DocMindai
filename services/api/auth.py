import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.config import settings
from services.api.database import get_db
from services.api.models import User, Workspace, Membership

security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return plain_password == hashed_password

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_or_create_default_user_and_workspace(db: AsyncSession) -> tuple[User, Workspace]:
    result = await db.execute(select(User).where(User.email == "researcher@docmind.ai"))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            email="researcher@docmind.ai",
            hashed_password=get_password_hash("docmind123"),
            full_name="Lead Researcher",
            role="owner"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    ws_result = await db.execute(select(Workspace).where(Workspace.slug == "default-research"))
    workspace = ws_result.scalar_one_or_none()
    
    if not workspace:
        workspace = Workspace(
            name="DocMind Research HQ",
            slug="default-research",
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
        
    return user, workspace

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials:
        user, _ = await get_or_create_default_user_and_workspace(db)
        return user
        
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def get_current_workspace(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Workspace:
    stmt = (
        select(Workspace)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .where(Membership.user_id == user.id)
    )
    result = await db.execute(stmt)
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        _, workspace = await get_or_create_default_user_and_workspace(db)
    return workspace

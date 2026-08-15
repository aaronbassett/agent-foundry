# FastAPI Guide

Current FastAPI idioms, execution-verified Aug 2026 against fastapi 0.141.1, pydantic 2.13.4, sqlalchemy 2.0.52, pwdlib 0.3.1, pyjwt 2.13.0, uvicorn 0.52.3 on Python 3.14.

## Skeleton: lifespan, not on_event

`@app.on_event("startup")` is deprecated. Put startup/shutdown in a lifespan context manager — it runs under the server and under lifespan-aware test clients, unlike module-scope setup.

```python
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:  # startup
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()  # shutdown

app = FastAPI(lifespan=lifespan)

DbSession = Annotated[AsyncSession, Depends(get_db)]
```

Run: `uv run uvicorn app.main:app --reload`. The `Annotated` alias keeps endpoint signatures short; tests swap the dependency with `app.dependency_overrides[get_db] = fake_db`.

## SQLAlchemy 2.0 async

`declarative_base()` (from `ext.declarative`) and `sessionmaker(class_=AsyncSession)` are 1.x idioms. Current: subclass `DeclarativeBase`, type columns as `Mapped[...]` with `mapped_column()`, build sessions with `async_sessionmaker`, yield them from a dependency so cleanup always runs.

```python
from sqlalchemy import String, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    hashed_password: Mapped[str]

engine = create_async_engine("sqlite+aiosqlite:///./app.db")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with SessionLocal() as session:
        yield session
```

## Pydantic v2

`@field_validator` replaces `@validator`, `model_config = ConfigDict(...)` replaces `class Config`, `.model_dump()` replaces `.dict()`. `from_attributes=True` lets `response_model` serialize ORM objects directly. `EmailStr` needs `pydantic[email]` (ImportError otherwise).

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator

class UserIn(BaseModel):
    email: str
    password: str = Field(min_length=12)

    @field_validator("email")
    @classmethod
    def lowercase(cls, v: str) -> str:
        return v.strip().lower()

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # build from ORM objects
    id: int
    email: str

@app.post("/users", response_model=UserOut, status_code=201)
async def create_user(body: UserIn, db: DbSession):
    user = User(email=body.email, hashed_password=password_hash.hash(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

## Auth: pwdlib + PyJWT, secret from env

Do not use passlib (unreleased since 2020; its bcrypt backend crashes against bcrypt >= 4.1) or python-jose — current FastAPI practice is pwdlib (argon2) and PyJWT. `datetime.utcnow()` is deprecated and yields a naive `exp`; use `datetime.now(timezone.utc)`. Load the secret from the environment via pydantic-settings and make it at least 32 bytes — PyJWT emits `InsecureKeyLengthWarning` for shorter HS256 keys.

```python
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    secret_key: str  # read from SECRET_KEY env var — never hardcode
    token_ttl_min: int = 15

settings = Settings()
password_hash = PasswordHash.recommended()  # argon2id

def create_access_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.token_ttl_min)
    return jwt.encode({"sub": sub, "exp": exp}, settings.secret_key, algorithm="HS256")

def decode_token(token: str) -> str:
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])["sub"]
```

`OAuth2PasswordRequestForm` (any `Form`/`File`) requires `python-multipart`; without it FastAPI raises `RuntimeError: Form data requires "python-multipart" to be installed` at route definition.

```python
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.post("/token")
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession):
    user = (await db.execute(select(User).where(User.email == form.username))).scalar_one_or_none()
    if user is None or not password_hash.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return {"access_token": create_access_token(user.email), "token_type": "bearer"}

async def current_subject(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    try:
        return decode_token(token)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.get("/me")
async def me(sub: Annotated[str, Depends(current_subject)]):
    return {"email": sub}
```

## CORS: the wildcard-credentials trap

`allow_origins=["*"]` with `allow_credentials=True` does not error — Starlette silently reflects whatever `Origin` the request sends, with `Access-Control-Allow-Credentials: true` (verified: a request with `Origin: https://evil.example` got that exact origin echoed back). Any website can then make credentialed requests to your API. With credentials, always list origins explicitly.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],  # explicit origins only
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## Testing through lifespan

A module-scope `TestClient(app)` never runs lifespan (no tables, no pools). Use `with TestClient(app) as client:`, or async-native httpx `ASGITransport` under `asgi-lifespan`'s `LifespanManager`:

```python
import httpx
import pytest
from asgi_lifespan import LifespanManager

from app.main import app

@pytest.mark.asyncio
async def test_signup_login_me():
    async with LifespanManager(app) as m:  # runs startup/shutdown
        transport = httpx.ASGITransport(app=m.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.post("/users", json={"email": "A@example.com", "password": "correct-horse-battery"})
            assert r.status_code == 201
            assert r.json()["email"] == "a@example.com"  # field_validator lowercased it

            r = await client.post("/token", data={"username": "a@example.com", "password": "correct-horse-battery"})
            token = r.json()["access_token"]

            r = await client.get("/me", headers={"Authorization": f"Bearer {token}"})
            assert r.json() == {"email": "a@example.com"}
```

Generic pytest setup, fixtures, parametrize: [testing.md](testing.md).

## Version landmarks

- `@app.on_event` → `lifespan=` parameter
- pydantic v1 → v2: `Field(regex=)` removed (use `pattern=`; raises `PydanticUserError`), `@validator` → `@field_validator`, `class Config` → `model_config`, `.dict()` → `.model_dump()`
- python-jose → PyJWT (`jwt.encode`/`jwt.decode`, `jwt.InvalidTokenError`)
- passlib + bcrypt → pwdlib `PasswordHash.recommended()`
- `declarative_base()` / `sessionmaker(class_=AsyncSession)` → `DeclarativeBase` / `async_sessionmaker`
- `datetime.utcnow()` → `datetime.now(timezone.utc)`


import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import (
    Column,
    Date,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'vikasana.db'}"

JWT_SECRET = os.environ.get("VIKASANA_JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError(
        "Set VIKASANA_JWT_SECRET to a random secret of at least 32 characters."
    )

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = 12

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

app = FastAPI(
    title="Vikasana API",
    description="Personal finance coaching API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# --------------------------------------------------
# DATABASE MODELS
# --------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)


class TransactionRecord(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    kind = Column(String, nullable=False)
    transaction_date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class GoalRecord(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    target = Column(Float, nullable=False)
    saved = Column(Float, default=0, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


# Create missing tables without deleting existing data.
Base.metadata.create_all(bind=engine)


# Add ownership columns to existing databases when necessary.
# Existing records remain unassigned rather than being exposed
# to newly registered accounts.
inspector = inspect(engine)

for table_name in ("transactions", "goals"):
    if table_name in inspector.get_table_names():
        existing_columns = {
            column["name"]
            for column in inspector.get_columns(table_name)
        }

        if "user_id" not in existing_columns:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        "ADD COLUMN user_id INTEGER REFERENCES users(id)"
                    )
                )


# --------------------------------------------------
# REQUEST SCHEMAS
# --------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TransactionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=80)
    amount: float = Field(gt=0, le=1_000_000_000)
    kind: str
    transaction_date: datetime


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    amount: float
    kind: str
    transaction_date: datetime
    user_id: int | None = None


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target: float = Field(gt=0, le=1_000_000_000)
    saved: float = Field(default=0, ge=0, le=1_000_000_000)


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    target: float
    saved: float
    user_id: int | None = None


class ContributionRequest(BaseModel):
    amount: float = Field(gt=0, le=1_000_000_000)


# --------------------------------------------------
# AUTHENTICATION HELPERS
# --------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=ACCESS_TOKEN_HOURS),
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db=Depends(get_db),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please log in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )

        subject = payload.get("sub")
        if not subject:
            raise InvalidTokenError("Missing user identifier")

        user_id = int(subject)

    except (InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please log in again.",
        )

    return user


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to Vikasana API",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "vikasana-api"}


# --------------------------------------------------
# REGISTRATION AND LOGIN
# --------------------------------------------------

@app.post("/api/auth/register")
def register(data: RegisterRequest, db=Depends(get_db)):
    email = str(data.email).strip().lower()

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        password_hash=password_hasher.hash(data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email},
    }


@app.post("/api/auth/login")
def login(data: LoginRequest, db=Depends(get_db)):
    email = str(data.email).strip().lower()

    user = db.query(User).filter(User.email == email).first()

    if user is None or not password_hasher.verify(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email},
    }


@app.get("/api/auth/me")
def get_me(user=Depends(get_current_user)):
    return {"id": user.id, "email": user.email}


# --------------------------------------------------
# TRANSACTIONS
# --------------------------------------------------

@app.get("/api/transactions", response_model=list[TransactionResponse])
def get_transactions(
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    return (
        db.query(TransactionRecord)
        .filter(TransactionRecord.user_id == user.id)
        .order_by(TransactionRecord.transaction_date.desc())
        .all()
    )


@app.post(
    "/api/transactions",
    response_model=TransactionResponse,
    status_code=201,
)
def create_transaction(
    data: TransactionCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if data.kind.lower() not in {"income", "expense"}:
        raise HTTPException(
            status_code=422,
            detail="kind must be either 'income' or 'expense'.",
        )

    record = TransactionRecord(
        name=data.name.strip(),
        category=data.category.strip(),
        amount=data.amount,
        kind=data.kind.lower(),
        transaction_date=data.transaction_date.date(),
        user_id=user.id,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    record = (
        db.query(TransactionRecord)
        .filter(
            TransactionRecord.id == transaction_id,
            TransactionRecord.user_id == user.id,
        )
        .first()
    )

    if record is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    db.delete(record)
    db.commit()

    return {"message": "Transaction deleted successfully."}


# --------------------------------------------------
# SAVINGS GOALS
# --------------------------------------------------

@app.get("/api/goals", response_model=list[GoalResponse])
def get_goals(
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    return (
        db.query(GoalRecord)
        .filter(GoalRecord.user_id == user.id)
        .order_by(GoalRecord.id.desc())
        .all()
    )


@app.post("/api/goals", response_model=GoalResponse, status_code=201)
def create_goal(
    data: GoalCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    if data.saved > data.target:
        raise HTTPException(
            status_code=422,
            detail="The saved amount cannot exceed the goal target.",
        )

    goal = GoalRecord(
        name=data.name.strip(),
        target=data.target,
        saved=data.saved,
        user_id=user.id,
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)

    return goal


@app.post("/api/goals/{goal_id}/contribute", response_model=GoalResponse)
def contribute_to_goal(
    goal_id: int,
    data: ContributionRequest,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    goal = (
        db.query(GoalRecord)
        .filter(
            GoalRecord.id == goal_id,
            GoalRecord.user_id == user.id,
        )
        .first()
    )

    if goal is None:
        raise HTTPException(status_code=404, detail="Savings goal not found.")

    if goal.saved + data.amount > goal.target:
        raise HTTPException(
            status_code=422,
            detail="This contribution would exceed your goal target.",
        )

    goal.saved += data.amount
    db.commit()
    db.refresh(goal)

    return goal


@app.delete("/api/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    goal = (
        db.query(GoalRecord)
        .filter(
            GoalRecord.id == goal_id,
            GoalRecord.user_id == user.id,
        )
        .first()
    )

    if goal is None:
        raise HTTPException(status_code=404, detail="Savings goal not found.")

    db.delete(goal)
    db.commit()

    return {"message": "Savings goal deleted successfully."}

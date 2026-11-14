
import os
import sqlite3
import hashlib
import secrets
import hmac

from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    Depends
)

from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from jose import jwt, JWTError
from pydantic import BaseModel, Field


# ==================================================
# CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

ALGORITHM = "HS256"

TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")
)

DATABASE_PATH = BASE_DIR / os.getenv(
    "DATABASE_PATH",
    "data/gameclub.db"
)

DATABASE_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)

if not SECRET_KEY or not ADMIN_API_KEY:
    raise RuntimeError(
        "SECRET_KEY and ADMIN_API_KEY must be set in backend/.env"
    )


# ==================================================
# AUTOMATIC LOGIN SLIDESHOW CONFIGURATION
# ==================================================

PROJECT_DIR = BASE_DIR.parent

SLIDESHOW_DIR = (
    PROJECT_DIR
    / "frontend"
    / "public"
    / "assets"
    / "slideshow"
)

SLIDESHOW_DIR.mkdir(
    parents=True,
    exist_ok=True
)

SLIDESHOW_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="YAZD TIRE GAME CLUB API",
    description="Employee authentication and game club backend",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Standard Bearer authentication for Swagger
bearer_scheme = HTTPBearer(
    auto_error=False
)


# ==================================================
# DATABASE
# ==================================================

def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():

    with get_connection() as connection:

        connection.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_code TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL,
                department TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)

        connection.commit()


initialize_database()


# ==================================================
# PASSWORD SECURITY
# ==================================================

PBKDF2_ITERATIONS = 310000


def hash_password(password: str) -> str:

    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS
    )

    return (
        f"pbkdf2_sha256${PBKDF2_ITERATIONS}$"
        f"{salt.hex()}${password_hash.hex()}"
    )


def verify_password(
    password: str,
    stored_hash: str
) -> bool:

    try:

        algorithm, iterations, salt_hex, hash_hex = (
            stored_hash.split("$")
        )

        if algorithm != "pbkdf2_sha256":
            return False

        calculated = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations)
        )

        return hmac.compare_digest(
            calculated.hex(),
            hash_hex
        )

    except (ValueError, TypeError):

        return False


# ==================================================
# REQUEST MODELS
# ==================================================

class LoginRequest(BaseModel):

    employee_code: str = Field(
        min_length=1,
        max_length=50
    )

    password: str = Field(
        min_length=1,
        max_length=128
    )


class EmployeeCreate(BaseModel):

    employee_code: str = Field(
        min_length=1,
        max_length=50
    )

    full_name: str = Field(
        min_length=2,
        max_length=120
    )

    department: str = Field(
        min_length=2,
        max_length=80
    )

    password: str = Field(
        min_length=8,
        max_length=128
    )


class EmployeeUpdate(BaseModel):

    full_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=120
    )

    department: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=80
    )

    password: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=128
    )

    is_active: Optional[bool] = None


# ==================================================
# HELPER FUNCTIONS
# ==================================================

def employee_to_dict(employee):

    return {
        "id": employee["id"],
        "employee_code": employee["employee_code"],
        "full_name": employee["full_name"],
        "department": employee["department"],
        "is_active": bool(employee["is_active"]),
        "created_at": employee["created_at"]
    }


def create_access_token(employee):

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(employee["id"]),
        "employee_code": employee["employee_code"],
        "iat": now,
        "exp": now + timedelta(
            minutes=TOKEN_EXPIRE_MINUTES
        )
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ==================================================
# ADMIN AUTHENTICATION
# ==================================================

def require_admin(
    admin_key: Optional[str] = Header(
        default=None,
        alias="X-Admin-Key"
    )
):

    if not admin_key or not hmac.compare_digest(
        admin_key,
        ADMIN_API_KEY
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid administrator key"
        )


# ==================================================
# EMPLOYEE AUTHENTICATION
# ==================================================

def get_current_employee(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        bearer_scheme
    )
):

    if (
        not credentials
        or credentials.scheme.lower() != "bearer"
    ):

        raise HTTPException(
            status_code=401,
            detail="Authentication token is required"
        )

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        employee_id = int(payload["sub"])

    except (JWTError, ValueError, KeyError, TypeError):

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    with get_connection() as connection:

        employee = connection.execute(
            """
            SELECT *
            FROM employees
            WHERE id = ?
            """,
            (employee_id,)
        ).fetchone()

    if not employee or not employee["is_active"]:

        raise HTTPException(
            status_code=401,
            detail="Employee account is inactive or unavailable"
        )

    return employee


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "YAZD TIRE GAME CLUB API",
        "database": "sqlite"
    }


# ==================================================
# AUTOMATIC LOGIN SLIDESHOW API
# ==================================================

@app.get("/api/slideshow/images")
def get_slideshow_images():

    images = []

    try:

        for file in SLIDESHOW_DIR.iterdir():

            if (
                file.is_file()
                and file.suffix.lower() in SLIDESHOW_EXTENSIONS
                and not file.name.startswith(".")
            ):

                images.append(file.name)

    except OSError:

        raise HTTPException(
            status_code=500,
            detail="Could not read slideshow images directory"
        )

    images.sort(key=str.casefold)

    return {
        "count": len(images),
        "images": images
    }


# ==================================================
# EMPLOYEE LOGIN
# ==================================================

@app.post("/api/auth/login")
def employee_login(data: LoginRequest):

    with get_connection() as connection:

        employee = connection.execute(
            """
            SELECT *
            FROM employees
            WHERE employee_code = ?
            """,
            (data.employee_code.strip(),)
        ).fetchone()

    if (
        not employee
        or not employee["is_active"]
        or not verify_password(
            data.password,
            employee["password_hash"]
        )
    ):

        raise HTTPException(
            status_code=401,
            detail="Employee code or password is incorrect"
        )

    token = create_access_token(employee)

    return {
        "access_token": token,
        "token_type": "bearer",
        "employee": employee_to_dict(employee)
    }


# ==================================================
# GET CURRENT EMPLOYEE PROFILE
# ==================================================

@app.get("/api/auth/me")
def get_my_profile(
    employee=Depends(get_current_employee)
):

    return {
        "employee": employee_to_dict(employee)
    }


# ==================================================
# ADMIN: CREATE EMPLOYEE
# ==================================================

@app.post(
    "/api/admin/employees",
    dependencies=[Depends(require_admin)]
)
def create_employee(data: EmployeeCreate):

    employee_code = data.employee_code.strip()

    if not employee_code:

        raise HTTPException(
            status_code=400,
            detail="Employee code cannot be empty"
        )

    try:

        with get_connection() as connection:

            cursor = connection.execute(
                """
                INSERT INTO employees (
                    employee_code,
                    full_name,
                    department,
                    password_hash,
                    is_active,
                    created_at
                )
                VALUES (?, ?, ?, ?, 1, ?)
                """,
                (
                    employee_code,
                    data.full_name.strip(),
                    data.department.strip(),
                    hash_password(data.password),
                    datetime.now(timezone.utc).isoformat()
                )
            )

            employee_id = cursor.lastrowid

            employee = connection.execute(
                """
                SELECT *
                FROM employees
                WHERE id = ?
                """,
                (employee_id,)
            ).fetchone()

            connection.commit()

    except sqlite3.IntegrityError:

        raise HTTPException(
            status_code=409,
            detail="This employee code already exists"
        )

    return {
        "message": "Employee created successfully",
        "employee": employee_to_dict(employee)
    }


# ==================================================
# ADMIN: LIST EMPLOYEES
# ==================================================

@app.get(
    "/api/admin/employees",
    dependencies=[Depends(require_admin)]
)
def list_employees():

    with get_connection() as connection:

        employees = connection.execute(
            """
            SELECT *
            FROM employees
            ORDER BY id DESC
            """
        ).fetchall()

    return {
        "count": len(employees),
        "employees": [
            employee_to_dict(employee)
            for employee in employees
        ]
    }


# ==================================================
# ADMIN: UPDATE EMPLOYEE
# ==================================================

@app.patch(
    "/api/admin/employees/{employee_id}",
    dependencies=[Depends(require_admin)]
)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate
):

    changes = data.model_dump(
        exclude_unset=True
    )

    if not changes:

        raise HTTPException(
            status_code=400,
            detail="No changes were provided"
        )

    allowed_fields = {
        "full_name",
        "department",
        "password",
        "is_active"
    }

    if not set(changes).issubset(allowed_fields):

        raise HTTPException(
            status_code=400,
            detail="Invalid update fields"
        )

    updates = {}

    for field, value in changes.items():

        if field == "password":

            updates["password_hash"] = hash_password(value)

        elif field == "is_active":

            updates[field] = 1 if value else 0

        elif field in ("full_name", "department"):

            updates[field] = value.strip()

    if not updates:

        raise HTTPException(
            status_code=400,
            detail="No valid changes were provided"
        )

    set_clause = ", ".join(
        f"{field} = ?" for field in updates
    )

    values = list(updates.values())
    values.append(employee_id)

    with get_connection() as connection:

        cursor = connection.execute(
            f"""
            UPDATE employees
            SET {set_clause}
            WHERE id = ?
            """,
            values
        )

        if cursor.rowcount == 0:

            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )

        employee = connection.execute(
            """
            SELECT *
            FROM employees
            WHERE id = ?
            """,
            (employee_id,)
        ).fetchone()

        connection.commit()

    return {
        "message": "Employee updated successfully",
        "employee": employee_to_dict(employee)
    }


# ==================================================
# ROOT
# ==================================================

@app.get("/")
def root():

    return {
        "message": "Welcome to YAZD TIRE GAME CLUB API",
        "version": "1.2.0",
        "docs": "/docs",
        "health": "/health",
        "slideshow": "/api/slideshow/images"
    }

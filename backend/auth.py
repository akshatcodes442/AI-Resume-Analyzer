from datetime import datetime, timedelta, timezone
from pathlib import Path
import json

from jose import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
import os


load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not configured. Add it to .env.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

USERS_FILE = Path("uploads/users.json")

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def load_users():
    if not USERS_FILE.exists():
        return []

    try:
        return json.loads(USERS_FILE.read_text())
    except Exception:
        return []


def save_users(users):
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(
        json.dumps(users, indent=2)
    )


def find_user_by_email(email):
    email = email.strip().lower()

    for user in load_users():
        if user.get("email") == email:
            return user

    return None


def hash_password(password):
    return pwd_context.hash(password)


def verify_password(password, hashed_password):
    return pwd_context.verify(
        password,
        hashed_password
    )


def create_access_token(data):
    payload = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload.update({
        "exp": expire
    })

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def decode_access_token(token):
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )

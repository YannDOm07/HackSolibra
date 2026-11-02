import secrets
import uuid
from datetime import datetime, timezone

# Pas de 0/O, 1/I : les codes sont lus et recopiés sur le terrain.
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Horodatage UTC naïf : c'est la convention de stockage de toute la base."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(dt: datetime | None) -> datetime | None:
    if dt is None or dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def short_code(prefix: str, year: int | None = None) -> str:
    """Code lisible et générable hors ligne, ex. KC-26-7QXM."""
    yy = (year or utcnow().year) % 100
    return f"{prefix}-{yy:02d}-" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(4))

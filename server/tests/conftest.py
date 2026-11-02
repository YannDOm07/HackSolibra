import os
import tempfile

# Base temporaire, isolée de la base de démonstration.
_tmp = tempfile.mkdtemp(prefix="kabochar-tests-")
os.environ["KABOCHAR_DATA_DIR"] = _tmp
os.environ["KABOCHAR_DEMO_SEED"] = "1"
os.environ["KABOCHAR_SIM_SPEED"] = "2000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

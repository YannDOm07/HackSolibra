import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import exists, select

from . import config
from .db import SessionLocal, init_db
from .models import Cuisson, Producteur
from .routers import fours, impact, lots, photos, producteurs, sync
from .services import finaliser_cuisson
from .temps_reel import hub, simulations

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s : %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as db:
        if config.DEMO_SEED and not db.scalar(select(exists().where(Producteur.id.is_not(None)))):
            from .seed import generer_demo

            generer_demo(db)
        # Une simulation coupée par l'arrêt du serveur ne reprendra pas : on la clôt proprement.
        for c in db.scalars(select(Cuisson).where(Cuisson.statut == "en_cours", Cuisson.source == "simulation")):
            finaliser_cuisson(db, c)
        db.commit()
    yield
    taches = list(simulations.values())
    for t in taches:
        t.cancel()
    await asyncio.gather(*taches, return_exceptions=True)


app = FastAPI(
    title="KaboChar API",
    version=config.VERSION,
    description="Traçabilité des lots de biochar de cabosses de cacao : producteurs, cuissons, capteurs, bilan carbone.",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

for module in (producteurs, lots, fours, impact, sync, photos):
    app.include_router(module.router, prefix="/api/v1")

config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=config.UPLOAD_DIR), name="media")


@app.get("/", include_in_schema=False)
def accueil():
    return RedirectResponse("/docs")


@app.websocket("/ws")
async def flux_direct(ws: WebSocket):
    await hub.connecter(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        hub.deconnecter(ws)

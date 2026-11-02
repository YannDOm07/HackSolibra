"""Diffusion en direct (WebSocket) des mesures des fours, et exécution des cuissons simulées."""
import asyncio
import logging
from datetime import timedelta

from fastapi import WebSocket

from .cuisson import analyser
from .db import SessionLocal
from .models import Cuisson, Mesure
from .services import finaliser_cuisson

log = logging.getLogger("kabochar.temps_reel")


class Hub:
    def __init__(self) -> None:
        self.clients: set[WebSocket] = set()
        # four_id -> {cuisson_id, temp, phase, source, t_s}
        self.etat: dict[str, dict] = {}
        # cuisson_id -> points (s, °C) déjà reçus, pour calculer la phase sans relire la base
        self.points: dict[str, list[tuple[float, float]]] = {}

    async def connecter(self, ws: WebSocket) -> None:
        await ws.accept()
        self.clients.add(ws)
        await ws.send_json({"type": "bonjour", "fours": self.etat})

    def deconnecter(self, ws: WebSocket) -> None:
        self.clients.discard(ws)

    async def diffuser(self, message: dict) -> None:
        for ws in list(self.clients):
            try:
                await ws.send_json(message)
            except Exception:
                self.clients.discard(ws)

    async def nouvelle_mesure(self, four_id: str, cuisson_id: str, t_s: float, temp: float, source: str) -> str:
        pts = self.points.setdefault(cuisson_id, [])
        pts.append((t_s, temp))
        phase = analyser(pts).phase
        self.etat[four_id] = {"cuisson_id": cuisson_id, "temp": temp, "phase": phase, "source": source, "t_s": t_s}
        await self.diffuser({"type": "mesure", "four_id": four_id, "cuisson_id": cuisson_id,
                             "t_s": t_s, "temp": temp, "phase": phase, "source": source})
        return phase

    async def cuisson_terminee(self, four_id: str, cuisson_id: str) -> None:
        self.etat.pop(four_id, None)
        self.points.pop(cuisson_id, None)
        await self.diffuser({"type": "cuisson_terminee", "four_id": four_id, "cuisson_id": cuisson_id})


hub = Hub()
simulations: dict[str, asyncio.Task] = {}


async def executer_simulation(cuisson_id: str, profil: list[tuple[float, float]], vitesse: float) -> None:
    with SessionLocal() as db:
        c = db.get(Cuisson, cuisson_id)
        four_id, device_id, debut = c.four_id, c.four.device_id or f"sim-{c.four.code}", c.debut
    pas = profil[1][0] - profil[0][0] if len(profil) > 1 else 10.0
    dernier_t = 0.0
    try:
        for t, temp in profil:
            await asyncio.sleep(pas / vitesse)
            with SessionLocal() as db:
                db.add(Mesure(device_id=device_id, four_id=four_id, cuisson_id=cuisson_id,
                              t=debut + timedelta(seconds=t), temp_c=temp, source="simulation"))
                db.commit()
            await hub.nouvelle_mesure(four_id, cuisson_id, t, temp, "simulation")
            dernier_t = t
    except asyncio.CancelledError:
        log.info("Simulation %s interrompue", cuisson_id)
        raise
    finally:
        with SessionLocal() as db:
            c = db.get(Cuisson, cuisson_id)
            if c and c.statut == "en_cours":
                finaliser_cuisson(db, c, fin=debut + timedelta(seconds=dernier_t))
                db.commit()
        simulations.pop(four_id, None)
        await hub.cuisson_terminee(four_id, cuisson_id)

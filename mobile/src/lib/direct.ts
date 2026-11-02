/** Flux en direct des fours (WebSocket du serveur). */
import { useEffect } from 'react';

import { wsUrl } from './api';
import { useEtat } from './store';
import { synchroniser } from './synchro';

type Ecouteur = (t_s: number, temp: number, phase: string) => void;
const ecouteurs = new Map<string, Set<Ecouteur>>();

/** Reçoit chaque mesure d'une cuisson, sans passer par l'état global (jusqu'à 2 mesures par seconde). */
export function ecouterCuisson(cuissonId: string, f: Ecouteur) {
  const set = ecouteurs.get(cuissonId) ?? new Set();
  set.add(f);
  ecouteurs.set(cuissonId, set);
  return () => {
    set.delete(f);
  };
}

type Message =
  | { type: 'bonjour'; fours: Record<string, { cuisson_id: string; temp: number; phase: string; source: string; t_s: number }> }
  | { type: 'mesure'; four_id: string; cuisson_id: string; t_s: number; temp: number; phase: string; source: string }
  | { type: 'cuisson_demarree'; four_id: string; cuisson_id: string; source: string }
  | { type: 'cuisson_terminee'; four_id: string; cuisson_id: string }
  | { type: 'mesure_libre'; device_id: string; temp: number; temp_interne: number | null; four_id: string | null };

function traiter(m: Message) {
  const maj = (f: (d: ReturnType<typeof useEtat.getState>['direct']) => Partial<ReturnType<typeof useEtat.getState>['direct']>) =>
    useEtat.setState((e) => ({ direct: { ...e.direct, ...f(e.direct) } }));

  switch (m.type) {
    case 'bonjour':
      maj(() => ({ fours: m.fours }));
      break;
    case 'mesure':
      ecouteurs.get(m.cuisson_id)?.forEach((f) => f(m.t_s, m.temp, m.phase));
      maj((d) => ({
        fours: { ...d.fours, [m.four_id]: { cuisson_id: m.cuisson_id, temp: m.temp, phase: m.phase, source: m.source, t_s: m.t_s } },
      }));
      break;
    case 'cuisson_demarree':
      maj((d) => ({ fours: { ...d.fours, [m.four_id]: { cuisson_id: m.cuisson_id, temp: null, phase: 'en_attente', source: m.source, t_s: 0 } } }));
      synchroniser();
      break;
    case 'cuisson_terminee': {
      maj((d) => {
        const { [m.four_id]: _, ...fours } = d.fours;
        return { fours };
      });
      ecouteurs.get(m.cuisson_id)?.forEach((f) => f(-1, Number.NaN, 'terminee'));
      synchroniser();
      break;
    }
    case 'mesure_libre':
      maj((d) => ({
        capteurs: { ...d.capteurs, [m.device_id]: { device_id: m.device_id, temp: m.temp, temp_interne: m.temp_interne, four_id: m.four_id, recu: Date.now() } },
      }));
      break;
  }
}

/** Garde une connexion ouverte tant que l'application tourne, avec reconnexion progressive. */
export function useConnexionDirecte() {
  const pret = useEtat((e) => e.pret);
  const apiUrl = useEtat((e) => e.apiUrl);

  useEffect(() => {
    if (!pret) return;
    let ws: WebSocket | null = null;
    let attente = 1500;
    let arrete = false;
    let minuteur: ReturnType<typeof setTimeout> | undefined;

    const connecter = () => {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => {
        attente = 1500;
        useEtat.setState((e) => ({ direct: { ...e.direct, connecte: true } }));
      };
      ws.onmessage = (ev) => {
        try {
          traiter(JSON.parse(String(ev.data)) as Message);
        } catch {}
      };
      ws.onclose = () => {
        useEtat.setState((e) => ({ direct: { ...e.direct, connecte: false } }));
        if (!arrete) {
          minuteur = setTimeout(connecter, attente);
          attente = Math.min(attente * 1.6, 15_000);
        }
      };
      ws.onerror = () => ws?.close();
    };
    connecter();
    return () => {
      arrete = true;
      clearTimeout(minuteur);
      ws?.close();
    };
  }, [pret, apiUrl]);
}

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { Cuisson, CuissonDetail, Meta, Passeport, ReponseSync } from './types';

/** Le serveur tourne sur le PC qui sert aussi l'application à Expo Go : même adresse IP, port 8000. */
export function urlParDefaut(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  const hote = Constants.expoConfig?.hostUri?.split(':')[0];
  return hote ? `http://${hote}:8000` : 'http://192.168.1.10:8000';
}

let base = urlParDefaut();
export const getApiUrl = () => base;
export function setApiUrl(url: string) {
  base = url.trim().replace(/\/+$/, '');
}
export const wsUrl = () => `${base.replace(/^http/, 'ws')}/ws`;
export const mediaUrl = (chemin: string) => `${base}${chemin}`;

export class ErreurApi extends Error {
  constructor(message: string, public statut?: number) {
    super(message);
  }
}

async function requete<T>(chemin: string, init: RequestInit & { delai?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), init.delai ?? 8000);
  try {
    const estFormulaire = typeof FormData !== 'undefined' && init.body instanceof FormData;
    const r = await fetch(`${base}/api/v1${chemin}`, {
      ...init,
      signal: ctrl.signal,
      headers: estFormulaire ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
    });
    if (!r.ok) {
      let detail: unknown;
      try {
        detail = (await r.json()).detail;
      } catch {}
      throw new ErreurApi(typeof detail === 'string' ? detail : `Erreur ${r.status}`, r.status);
    }
    return (await r.json()) as T;
  } catch (e) {
    if (e instanceof ErreurApi) throw e;
    throw new ErreurApi('Serveur injoignable');
  } finally {
    clearTimeout(minuteur);
  }
}

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  sante: () => requete<{ ok: boolean; version: string }>('/health', { delai: 3000 }),
  meta: () => requete<Meta>('/meta'),
  sync: (payload: unknown) => requete<ReponseSync>('/sync', { ...json(payload), delai: 20000 }),
  passeport: (id: string) => requete<Passeport>(`/lots/${id}/passeport`),
  passeportParCode: (code: string) => requete<Passeport>(`/lots/code/${encodeURIComponent(code)}`),
  cuisson: (id: string) => requete<CuissonDetail>(`/cuissons/${id}`),
  mesuresCuisson: (id: string, apres = -1) => requete<[number, number][]>(`/cuissons/${id}/mesures?apres_s=${apres}`),
  cuissonsDuFour: (fourId: string) => requete<Cuisson[]>(`/cuissons?four_id=${fourId}&limite=6`),
  demarrerCuisson: (four_id: string, lot_id?: string) => requete<Cuisson>('/cuissons', json({ four_id, lot_id })),
  simulerCuisson: (four_id: string, lot_id?: string) =>
    requete<Cuisson>(`/fours/${four_id}/simulation`, json({ lot_id })),
  terminerCuisson: (id: string) => requete<Cuisson>(`/cuissons/${id}/terminer`, { method: 'POST' }),

  async envoyerPhoto(p: { uri: string; type: string; lot_id?: string; latitude?: number; longitude?: number }) {
    const form = new FormData();
    if (Platform.OS === 'web') {
      form.append('fichier', await (await fetch(p.uri)).blob(), 'photo.jpg');
    } else {
      // React Native accepte un objet { uri, name, type } comme fichier.
      form.append('fichier', { uri: p.uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
    }
    form.append('type', p.type);
    if (p.lot_id) form.append('lot_id', p.lot_id);
    if (p.latitude != null) form.append('latitude', String(p.latitude));
    if (p.longitude != null) form.append('longitude', String(p.longitude));
    return requete<{ id: string; url: string }>('/photos', { method: 'POST', body: form, delai: 30000 });
  },
};

// En développement, Vite tourne sur le port 5173 et l'API sur le 8000 ; une fois construit, le tableau
// de bord est servi par l'API elle-même (même origine).
export const API: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? `${location.protocol}//${location.hostname}:8000` : location.origin)

export const wsUrl = () => `${API.replace(/^http/, 'ws')}/ws`
export const mediaUrl = (chemin: string) => `${API}${chemin}`

export class ErreurApi extends Error {
  statut?: number
  constructor(message: string, statut?: number) {
    super(message)
    this.statut = statut
  }
}

async function requete<T>(chemin: string, init?: RequestInit): Promise<T> {
  let r: Response
  try {
    r = await fetch(`${API}/api/v1${chemin}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new ErreurApi('Serveur injoignable')
  }
  if (!r.ok) {
    const detail = await r.json().then((j) => j.detail).catch(() => null)
    throw new ErreurApi(typeof detail === 'string' ? detail : `Erreur ${r.status}`, r.status)
  }
  return r.json() as Promise<T>
}

export const lire = <T>(chemin: string) => requete<T>(chemin)
export const envoyer = <T>(chemin: string, corps?: unknown) =>
  requete<T>(chemin, { method: 'POST', body: corps === undefined ? undefined : JSON.stringify(corps) })

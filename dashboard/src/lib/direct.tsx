/** Flux en direct des fours (WebSocket du serveur), partagé par toutes les pages. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { wsUrl } from './api'

export interface EtatFour {
  cuisson_id: string
  temp: number | null
  phase: string | null
  source: string
  t_s: number
}

export interface CapteurLibre {
  device_id: string
  temp: number
  temp_interne: number | null
  four_id: string | null
  recu: number
}

interface EtatDirect {
  connecte: boolean
  fours: Record<string, EtatFour>
  capteurs: Record<string, CapteurLibre>
  /** Augmente à chaque début ou fin de cuisson : les pages rechargent alors leurs données. */
  version: number
}

const Contexte = createContext<EtatDirect>({ connecte: false, fours: {}, capteurs: {}, version: 0 })
export const useDirect = () => useContext(Contexte)

type Ecouteur = (t_s: number, temp: number) => void
const ecouteurs = new Map<string, Set<Ecouteur>>()

/** Reçoit chaque mesure d'une cuisson donnée (courbes en direct). */
export function ecouterCuisson(cuissonId: string, f: Ecouteur) {
  const set = ecouteurs.get(cuissonId) ?? new Set<Ecouteur>()
  set.add(f)
  ecouteurs.set(cuissonId, set)
  return () => {
    set.delete(f)
  }
}

export function FournisseurDirect({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatDirect>({ connecte: false, fours: {}, capteurs: {}, version: 0 })

  useEffect(() => {
    let ws: WebSocket | null = null
    let attente = 1500
    let arrete = false
    let minuteur: ReturnType<typeof setTimeout> | undefined

    const traiter = (m: Record<string, unknown>) => {
      switch (m.type) {
        case 'bonjour':
          setEtat((e) => ({ ...e, fours: m.fours as Record<string, EtatFour> }))
          break
        case 'mesure': {
          const four = m.four_id as string
          const cuisson = m.cuisson_id as string
          ecouteurs.get(cuisson)?.forEach((f) => f(m.t_s as number, m.temp as number))
          setEtat((e) => ({
            ...e,
            fours: { ...e.fours, [four]: { cuisson_id: cuisson, temp: m.temp as number, phase: m.phase as string, source: m.source as string, t_s: m.t_s as number } },
          }))
          break
        }
        case 'cuisson_demarree':
          setEtat((e) => ({
            ...e,
            version: e.version + 1,
            fours: { ...e.fours, [m.four_id as string]: { cuisson_id: m.cuisson_id as string, temp: null, phase: 'en_attente', source: m.source as string, t_s: 0 } },
          }))
          break
        case 'cuisson_terminee':
          setEtat((e) => {
            const fours = { ...e.fours }
            delete fours[m.four_id as string]
            return { ...e, fours, version: e.version + 1 }
          })
          break
        case 'mesure_libre':
          setEtat((e) => ({
            ...e,
            capteurs: {
              ...e.capteurs,
              [m.device_id as string]: {
                device_id: m.device_id as string,
                temp: m.temp as number,
                temp_interne: (m.temp_interne as number | null) ?? null,
                four_id: (m.four_id as string | null) ?? null,
                recu: Date.now(),
              },
            },
          }))
          break
      }
    }

    const connecter = () => {
      ws = new WebSocket(wsUrl())
      ws.onopen = () => {
        attente = 1500
        setEtat((e) => ({ ...e, connecte: true }))
      }
      ws.onmessage = (ev) => {
        try {
          traiter(JSON.parse(String(ev.data)))
        } catch {
          // message illisible : ignoré
        }
      }
      ws.onclose = () => {
        setEtat((e) => ({ ...e, connecte: false }))
        if (!arrete) {
          minuteur = setTimeout(connecter, attente)
          attente = Math.min(attente * 1.6, 15000)
        }
      }
      ws.onerror = () => ws?.close()
    }
    connecter()
    return () => {
      arrete = true
      clearTimeout(minuteur)
      ws?.close()
    }
  }, [])

  return <Contexte.Provider value={etat}>{children}</Contexte.Provider>
}

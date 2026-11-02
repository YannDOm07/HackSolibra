import { useEffect, useState } from 'react'

import { lire } from './api'
import { ecouterCuisson, useDirect } from './direct'
import type { CuissonDetail } from './types'

/** Détail et courbe d'une cuisson ; si elle est en cours, la courbe se prolonge en direct. */
export function useCuisson(cuissonId: string | null | undefined) {
  const { version } = useDirect()
  const [detail, setDetail] = useState<CuissonDetail | null>(null)
  const [points, setPoints] = useState<[number, number][]>([])

  useEffect(() => {
    setDetail(null)
    setPoints([])
    if (!cuissonId) return
    let actif = true
    let synchronise = false
    const tampon: [number, number][] = []

    // Abonnement avant le chargement de l'historique : aucune mesure ne se perd entre les deux.
    const desabonner = ecouterCuisson(cuissonId, (t, temp) => {
      const p: [number, number] = [t / 60, temp]
      if (synchronise) setPoints((ps) => [...ps, p])
      else tampon.push(p)
    })

    ;(async () => {
      try {
        const d = await lire<CuissonDetail>(`/cuissons/${cuissonId}`)
        if (!actif) return
        setDetail(d)
        if (d.statut === 'terminee') {
          setPoints(d.courbe)
        } else {
          const brut = await lire<[number, number][]>(`/cuissons/${cuissonId}/mesures`)
          const base = brut.map(([t, v]) => [t / 60, v] as [number, number])
          const dernier = base.length ? base[base.length - 1][0] : -1
          if (actif) setPoints([...base, ...tampon.filter((p) => p[0] > dernier)])
        }
        synchronise = true
      } catch {
        // le panneau reste vide ; le prochain rafraîchissement réessaiera
      }
    })()

    // L'analyse (couches, palier, classe) est recalculée côté serveur : on la relit régulièrement.
    const minuteur = setInterval(() => {
      lire<CuissonDetail>(`/cuissons/${cuissonId}`)
        .then((d) => actif && setDetail(d))
        .catch(() => {})
    }, 12_000)
    return () => {
      actif = false
      desabonner()
      clearInterval(minuteur)
    }
  }, [cuissonId])

  useEffect(() => {
    if (!cuissonId || !version) return
    lire<CuissonDetail>(`/cuissons/${cuissonId}`)
      .then(setDetail)
      .catch(() => {})
  }, [cuissonId, version])

  return { detail, points }
}

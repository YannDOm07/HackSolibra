import { useCallback, useEffect, useRef, useState } from 'react'

import { lire } from './api'
import { useDirect } from './direct'

/**
 * Lit une ressource de l'API et la tient à jour : rechargement périodique, et immédiat à chaque début
 * ou fin de cuisson. Pendant un rechargement, l'ancien affichage reste en place (pas de clignotement).
 */
export function useApi<T>(chemin: string | null, intervalle = 30_000) {
  const { version } = useDirect()
  const [donnees, setDonnees] = useState<T | undefined>(undefined)
  const [erreur, setErreur] = useState<string | null>(null)
  const [charge, setCharge] = useState(false)
  const courant = useRef(chemin)
  courant.current = chemin

  const recharger = useCallback(async () => {
    if (!chemin) return
    setCharge(true)
    try {
      const d = await lire<T>(chemin)
      if (courant.current === chemin) {
        setDonnees(d)
        setErreur(null)
      }
    } catch (e) {
      if (courant.current === chemin) setErreur((e as Error).message)
    } finally {
      if (courant.current === chemin) setCharge(false)
    }
  }, [chemin])

  useEffect(() => {
    recharger()
  }, [recharger, version])

  useEffect(() => {
    if (!intervalle) return
    const t = setInterval(recharger, intervalle)
    return () => clearInterval(t)
  }, [recharger, intervalle])

  return { donnees, erreur, charge, recharger }
}

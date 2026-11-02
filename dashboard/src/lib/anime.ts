import { useEffect, useRef, useState } from 'react'

/** Fait défiler un nombre vers sa nouvelle valeur (décélération douce), sans à-coup. */
export function useNombreAnime(cible: number, duree = 900): number {
  const [valeur, setValeur] = useState(0)
  const depart = useRef(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      depart.current = cible
      setValeur(cible)
      return
    }
    const debut = performance.now()
    const de = depart.current
    let image = 0
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree)
      const v = de + (cible - de) * (1 - (1 - p) ** 3)
      depart.current = v
      setValeur(v)
      if (p < 1) image = requestAnimationFrame(pas)
    }
    image = requestAnimationFrame(pas)
    // Filet de sécurité : la valeur finale s'affiche même si l'onglet est en arrière-plan.
    const garde = setTimeout(() => {
      depart.current = cible
      setValeur(cible)
    }, duree + 100)
    return () => {
      cancelAnimationFrame(image)
      clearTimeout(garde)
    }
  }, [cible, duree])
  return valeur
}

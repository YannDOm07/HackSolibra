import 'leaflet/dist/leaflet.css'

import { latLngBounds } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'

import type { EtatFour } from '@/lib/direct'
import { masseTexte, nombre, temperature } from '@/lib/format'
import { PHASES } from '@/lib/theme'
import type { Four, Lot, Parcelle, Producteur } from '@/lib/types'

const AMENDEE = '#348F4F'
const SANS_EPANDAGE = '#7A736A'

// Fonds libres d'accès (sans clé) ; le plan OpenStreetMap est assombri en CSS pour la salle de contrôle.
const FONDS = {
  plan: {
    libelle: 'Plan',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    classe: 'fond-plan',
  },
  satellite: {
    libelle: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagerie &copy; Esri, Maxar, Earthstar Geographics',
    classe: 'fond-satellite',
  },
}
type Fond = keyof typeof FONDS

function Cadrage({ points }: { points: [number, number][] }) {
  const carte = useMap()
  useEffect(() => {
    if (points.length) carte.fitBounds(latLngBounds(points), { padding: [36, 36], maxZoom: 13 })
  }, [carte, points])
  return null
}

/**
 * Parcelles et fours sur fond de carte. Une parcelle est « amendée » quand un lot de biochar y a été épandu.
 * Sans connexion internet, le fond ne charge pas mais les points restent lisibles.
 */
export function CarteTerrain({
  parcelles,
  fours,
  lots,
  producteurs,
  direct,
}: {
  parcelles: Parcelle[]
  fours: Four[]
  lots: Lot[]
  producteurs: Record<string, Producteur>
  direct: Record<string, EtatFour>
}) {
  const recu = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of lots) {
      if (l.statut === 'epandu' && l.parcelle_destination_id) {
        m.set(l.parcelle_destination_id, (m.get(l.parcelle_destination_id) ?? 0) + (l.masse_biochar_kg ?? 0))
      }
    }
    return m
  }, [lots])
  const [fond, setFond] = useState<Fond>('plan')
  const points = useMemo<[number, number][]>(
    () => [...parcelles.map((p) => [p.latitude, p.longitude] as [number, number]), ...fours.map((f) => [f.latitude, f.longitude] as [number, number])],
    [parcelles, fours],
  )

  return (
    <div>
      <div className="carte" style={{ position: 'relative' }}>
        <div className="segment" role="group" aria-label="Fond de carte" style={{ position: 'absolute', top: 10, right: 10, zIndex: 500 }}>
          {(Object.keys(FONDS) as Fond[]).map((f) => (
            <button key={f} type="button" aria-pressed={fond === f} onClick={() => setFond(f)}>
              {FONDS[f].libelle}
            </button>
          ))}
        </div>
        <MapContainer center={[5.85, -4.2]} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} attributionControl>
          <TileLayer key={fond} url={FONDS[fond].url} attribution={FONDS[fond].attribution} className={FONDS[fond].classe} maxZoom={18} />
          <Cadrage points={points} />
          {parcelles.map((p) => {
            const kg = recu.get(p.id)
            return (
              <CircleMarker
                key={p.id}
                center={[p.latitude, p.longitude]}
                radius={kg ? 7 : 5}
                pathOptions={{ color: '#181613', weight: 2, fillColor: kg ? AMENDEE : SANS_EPANDAGE, fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <strong>{p.nom}</strong>
                  <div className="muet">
                    {producteurs[p.producteur_id]?.nom ?? '—'} · {p.surface_ha ? `${nombre(p.surface_ha, 1)} ha` : 'surface non relevée'}
                  </div>
                  <div>{kg ? `${masseTexte(kg)} de biochar reçus` : 'Pas encore de biochar épandu'}</div>
                </Tooltip>
              </CircleMarker>
            )
          })}
          {fours.map((f) => {
            const etat = direct[f.id]
            return (
              <CircleMarker
                key={f.id}
                center={[f.latitude, f.longitude]}
                radius={etat ? 11 : 9}
                className={etat ? 'four-actif' : undefined}
                pathOptions={{ color: '#F2652A', weight: 3, fillColor: etat ? '#F2652A' : '#181613', fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -10]}>
                  <strong>{f.nom}</strong>
                  <div className="muet">
                    {f.code} · {f.operateurs} opérateurs
                  </div>
                  <div>{etat ? `${PHASES[etat.phase ?? 'en_attente']?.libelle ?? ''} · ${temperature(etat.temp)}` : 'Au repos'}</div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
      <div className="legende">
        <span>
          <span className="cle" style={{ background: AMENDEE, borderRadius: '50%' }} />
          Parcelle amendée
        </span>
        <span>
          <span className="cle" style={{ background: SANS_EPANDAGE, borderRadius: '50%' }} />
          Parcelle sans épandage
        </span>
        <span>
          <span className="cle" style={{ background: 'transparent', border: '2px solid #F2652A', borderRadius: '50%' }} />
          Four (plein : en cuisson)
        </span>
      </div>
    </div>
  )
}

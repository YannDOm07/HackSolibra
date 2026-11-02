import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { Crosshair, Expand, Flame, MapPin, Minus, Play, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import { Link } from 'react-router'

import { envoyer } from '@/lib/api'
import { useCuisson } from '@/lib/cuisson'
import type { EtatFour } from '@/lib/direct'
import { dateHeure, ilYa, masseTexte, nombre, temperature } from '@/lib/format'
import { CLASSES, ETAPES, PHASES } from '@/lib/theme'
import { STATUTS, type Four, type Lot, type Parcelle, type Producteur, type Statut } from '@/lib/types'

import { BadgeDemo, BadgeSource, PuceEtape } from './base'
import { CourbeTemperature } from './graphiques'

const SANS_LOT = '#7A736A'

// Fonds libres d'accès (sans clé) ; le plan OpenStreetMap est assombri en CSS pour la salle de contrôle.
const FONDS = {
  plan: { libelle: 'Plan', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', classe: 'fond-plan' },
  satellite: {
    libelle: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagerie &copy; Esri, Maxar, Earthstar Geographics',
    classe: 'fond-satellite',
  },
}
type Fond = keyof typeof FONDS
type Selection = { type: 'four' | 'parcelle'; id: string } | null
type Calques = { parcelles: boolean; fours: boolean; flux: boolean }

const FLAMME =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'

function iconeFour(actif: boolean, choisi: boolean) {
  return L.divIcon({
    className: 'icone-four',
    html: `<div class="four-marqueur${actif ? ' actif' : ''}${choisi ? ' choisi' : ''}">${FLAMME}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

/** État d'une parcelle : l'étape la plus avancée de ses lots en cours, sinon « amendée » ou « sans lot ». */
function etatParcelle(p: Parcelle, lots: Lot[]): { couleur: string; libelle: string } {
  const enCours = lots.filter((l) => l.parcelle_id === p.id && l.statut !== 'epandu')
  if (enCours.length) {
    const etape = enCours.map((l) => l.statut).sort((a, b) => STATUTS.indexOf(b) - STATUTS.indexOf(a))[0]
    return { couleur: ETAPES[etape].couleur, libelle: `Lot en cours · ${ETAPES[etape].libelle}` }
  }
  if (lots.some((l) => l.statut === 'epandu' && l.parcelle_destination_id === p.id)) return { couleur: ETAPES.epandu.couleur, libelle: 'Amendée au biochar' }
  return { couleur: SANS_LOT, libelle: 'Aucun lot en cours' }
}

function Evenements({ onVide }: { onVide: () => void }) {
  useMapEvents({ click: onVide })
  return null
}

export function CarteTerrain({
  parcelles,
  fours,
  lots,
  producteurs,
  direct,
  hauteur = 440,
  pleinePage,
  selectionInitiale = null,
}: {
  parcelles: Parcelle[]
  fours: Four[]
  lots: Lot[]
  producteurs: Record<string, Producteur>
  direct: Record<string, EtatFour>
  hauteur?: number | string
  pleinePage?: boolean
  selectionInitiale?: Selection
}) {
  const [carte, setCarte] = useState<L.Map | null>(null)
  const [fond, setFond] = useState<Fond>('plan')
  const [selection, setSelection] = useState<Selection>(selectionInitiale)
  const [calques, setCalques] = useState<Calques>({ parcelles: true, fours: true, flux: false })

  const points = useMemo<[number, number][]>(
    () => [...parcelles.map((p) => [p.latitude, p.longitude] as [number, number]), ...fours.map((f) => [f.latitude, f.longitude] as [number, number])],
    [parcelles, fours],
  )
  const parParcelle = useMemo(() => Object.fromEntries(parcelles.map((p) => [p.id, p])), [parcelles])
  const parFour = useMemo(() => Object.fromEntries(fours.map((f) => [f.id, f])), [fours])

  const recentrer = () => {
    if (carte && points.length) carte.flyToBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13, duration: 0.8 })
  }
  useEffect(() => {
    if (!carte || !points.length) return
    // Lien direct vers un four ou une parcelle (/carte?four=…) : on centre dessus, sinon sur toute la coopérative.
    const cible = selection?.type === 'four' ? parFour[selection.id] : selection?.type === 'parcelle' ? parParcelle[selection.id] : undefined
    if (cible) carte.setView([cible.latitude, cible.longitude], 12)
    else carte.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 })
  }, [carte, points.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Molette : active dès qu'on clique dans la carte (ne vole pas le défilement de la page) ; toujours en pleine page.
  useEffect(() => {
    if (!carte || pleinePage) return
    const activer = () => carte.scrollWheelZoom.enable()
    const desactiver = () => carte.scrollWheelZoom.disable()
    carte.on('focus click', activer)
    carte.on('blur mouseout', desactiver)
    return () => {
      carte.off('focus click', activer)
      carte.off('blur mouseout', desactiver)
    }
  }, [carte, pleinePage])

  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setSelection(null)
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [])

  const choisir = (s: Selection, centre: [number, number]) => {
    setSelection(s)
    carte?.flyTo(centre, Math.max(carte.getZoom(), 12), { duration: 0.6 })
  }

  // Flux de la boucle : parcelle d'origine → four, puis four → parcelle qui reçoit le biochar.
  const flux = useMemo(() => {
    const lignes: { cle: string; points: [number, number][]; retour: boolean }[] = []
    for (const l of lots) {
      if (!l.four_id || !parFour[l.four_id]) continue
      const concerne =
        calques.flux ||
        (selection?.type === 'four' && selection.id === l.four_id) ||
        (selection?.type === 'parcelle' && (selection.id === l.parcelle_id || selection.id === l.parcelle_destination_id))
      if (!concerne) continue
      const f = parFour[l.four_id]
      const origine = l.parcelle_id ? parParcelle[l.parcelle_id] : undefined
      const destination = l.parcelle_destination_id ? parParcelle[l.parcelle_destination_id] : undefined
      if (origine) lignes.push({ cle: `${l.id}-a`, points: [[origine.latitude, origine.longitude], [f.latitude, f.longitude]], retour: false })
      if (destination && l.statut === 'epandu') lignes.push({ cle: `${l.id}-r`, points: [[f.latitude, f.longitude], [destination.latitude, destination.longitude]], retour: true })
    }
    return lignes
  }, [lots, parFour, parParcelle, selection, calques.flux])

  const surface = parcelles.reduce((a, p) => a + (p.surface_ha ?? 0), 0)
  const enCuisson = fours.filter((f) => direct[f.id]).length

  return (
    <div>
      <div className="carte-cadre" style={{ height: hauteur }}>
        <MapContainer ref={setCarte} center={[5.85, -4.2]} zoom={10} zoomControl={false} scrollWheelZoom={!!pleinePage} style={{ height: '100%', width: '100%' }}>
          <TileLayer key={fond} url={FONDS[fond].url} attribution={FONDS[fond].attribution} className={FONDS[fond].classe} maxZoom={18} />
          <Evenements onVide={() => setSelection(null)} />

          {flux.map((l) => (
            <Polyline
              key={l.cle}
              positions={l.points}
              pathOptions={{ color: l.retour ? ETAPES.epandu.couleur : '#F2652A', weight: 2, opacity: 0.85, dashArray: l.retour ? undefined : '6 6' }}
            />
          ))}

          {calques.parcelles &&
            parcelles.map((p) => {
              const etat = etatParcelle(p, lots)
              const choisi = selection?.type === 'parcelle' && selection.id === p.id
              return (
                <CircleMarker
                  key={p.id}
                  center={[p.latitude, p.longitude]}
                  radius={Math.min(13, 5 + (p.surface_ha ?? 1) * 1.4)}
                  bubblingMouseEvents={false}
                  pathOptions={{ color: choisi ? '#FFFDFA' : '#100F0D', weight: choisi ? 3 : 2, fillColor: etat.couleur, fillOpacity: 0.95 }}
                  eventHandlers={{ click: () => choisir({ type: 'parcelle', id: p.id }, [p.latitude, p.longitude]) }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>
                    <strong>{p.nom}</strong>
                    <div className="muet">{producteurs[p.producteur_id]?.nom}</div>
                  </Tooltip>
                </CircleMarker>
              )
            })}

          {calques.fours &&
            fours.map((f) => (
              <Marker
                key={f.id}
                position={[f.latitude, f.longitude]}
                icon={iconeFour(!!direct[f.id], selection?.type === 'four' && selection.id === f.id)}
                eventHandlers={{ click: () => choisir({ type: 'four', id: f.id }, [f.latitude, f.longitude]) }}
              >
                <Tooltip direction="top" offset={[0, -18]}>
                  <strong>{f.nom}</strong>
                  <div className="muet">{direct[f.id] ? `${PHASES[direct[f.id].phase ?? 'en_attente']?.libelle} · ${temperature(direct[f.id].temp)}` : 'Au repos'}</div>
                </Tooltip>
              </Marker>
            ))}
        </MapContainer>

        <div className="carte-outils">
          <div className="carte-groupe">
            <button type="button" className="carte-bouton" aria-label="Zoomer" onClick={() => carte?.zoomIn()}>
              <Plus size={16} />
            </button>
            <button type="button" className="carte-bouton" aria-label="Dézoomer" onClick={() => carte?.zoomOut()}>
              <Minus size={16} />
            </button>
          </div>
          <button type="button" className="carte-bouton" aria-label="Recentrer" title="Recentrer sur la coopérative" onClick={recentrer}>
            <Crosshair size={16} />
          </button>
          <div className="segment carte-verre" role="group" aria-label="Fond de carte">
            {(Object.keys(FONDS) as Fond[]).map((f) => (
              <button key={f} type="button" aria-pressed={fond === f} onClick={() => setFond(f)}>
                {FONDS[f].libelle}
              </button>
            ))}
          </div>
          {!pleinePage && (
            <Link to="/carte" className="carte-bouton" aria-label="Plein écran" title="Ouvrir la carte en plein écran">
              <Expand size={15} />
            </Link>
          )}
        </div>

        <div className="carte-stats">
          <span>
            <b>{parcelles.length}</b> parcelles · <b>{nombre(surface, 1)}</b> ha
          </span>
          <span>
            <b>{fours.length}</b> fours{enCuisson ? ` · ${enCuisson} en cuisson` : ''}
          </span>
          {!pleinePage && <span className="discret">Cliquez sur la carte pour zoomer à la molette</span>}
        </div>

        {selection && (
          <aside className="carte-panneau" key={selection.id}>
            <button type="button" className="carte-fermer" aria-label="Fermer" onClick={() => setSelection(null)}>
              <X size={16} />
            </button>
            {selection.type === 'four' && parFour[selection.id] ? (
              <DetailFour four={parFour[selection.id]} etat={direct[selection.id]} lots={lots.filter((l) => l.four_id === selection.id)} />
            ) : selection.type === 'parcelle' && parParcelle[selection.id] ? (
              <DetailParcelle parcelle={parParcelle[selection.id]} lots={lots} producteur={producteurs[parParcelle[selection.id].producteur_id]} />
            ) : null}
          </aside>
        )}
      </div>

      <div className="legende" role="group" aria-label="Calques de la carte">
        <Bascule actif={calques.parcelles} onClick={() => setCalques((c) => ({ ...c, parcelles: !c.parcelles }))}>
          <span className="cle" style={{ background: ETAPES.epandu.couleur, borderRadius: '50%' }} />
          Parcelles
        </Bascule>
        <Bascule actif={calques.fours} onClick={() => setCalques((c) => ({ ...c, fours: !c.fours }))}>
          <span className="cle" style={{ background: '#181613', border: '2px solid #F2652A', borderRadius: '50%' }} />
          Fours
        </Bascule>
        <Bascule actif={calques.flux} onClick={() => setCalques((c) => ({ ...c, flux: !c.flux }))}>
          <span style={{ width: 16, borderTop: '2px dashed #F2652A', display: 'inline-block' }} />
          Tous les flux
        </Bascule>
        <span className="discret" style={{ marginLeft: 'auto' }}>
          Couleur d'une parcelle : étape de son lot en cours ·
          {STATUTS.map((s: Statut) => (
            <span key={s} className="cle" title={ETAPES[s].libelle} style={{ background: ETAPES[s].couleur, borderRadius: '50%', marginLeft: 5, verticalAlign: -1 }} />
          ))}
          <span className="cle" title="Aucun lot en cours" style={{ background: SANS_LOT, borderRadius: '50%', marginLeft: 5, verticalAlign: -1 }} />
        </span>
      </div>
    </div>
  )
}

function Bascule({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="bascule" aria-pressed={actif} onClick={onClick}>
      {children}
    </button>
  )
}

function DetailFour({ four, etat, lots }: { four: Four; etat?: EtatFour; lots: Lot[] }) {
  const actif = etat?.cuisson_id ?? four.cuisson_active_id
  const { detail, points } = useCuisson(actif ?? four.derniere_cuisson_id)
  const [occupe, setOccupe] = useState(false)
  const dernier = points[points.length - 1]
  const phase = PHASES[etat?.phase ?? 'en_attente']
  const biochar = lots.reduce((a, l) => a + (l.masse_biochar_kg ?? 0), 0)

  return (
    <div>
      <div className="etiquette">
        Four · <span className="mono">{four.code}</span>
      </div>
      <h3 style={{ fontSize: 22, marginTop: 6 }}>{four.nom}</h3>
      <div className="actions" style={{ marginTop: 8 }}>
        {four.demo && <BadgeDemo />}
        {actif && <BadgeSource source={etat?.source ?? detail?.source} />}
      </div>

      {actif ? (
        <div className="carte-bloc" style={{ borderColor: '#5a2a14' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="mono" style={{ fontSize: 36, fontWeight: 600, color: '#FFB37A', lineHeight: 1 }}>
              {temperature(dernier?.[1] ?? etat?.temp)}
            </div>
            <span className="etat" style={{ fontSize: 13 }}>
              <span className="point vivant" style={{ background: phase.couleur, color: phase.couleur }} />
              {phase.libelle}
            </span>
          </div>
          <div style={{ marginTop: 10, marginInline: -8 }}>
            <CourbeTemperature points={points} enDirect hauteur={130} dureeMin={120} />
          </div>
        </div>
      ) : (
        <div className="carte-bloc">
          <div className="muet" style={{ fontSize: 13 }}>
            Au repos
          </div>
          {four.derniere_cuisson_le ? (
            <>
              <div style={{ fontWeight: 600, marginTop: 4 }}>Dernière cuisson {ilYa(four.derniere_cuisson_le)}</div>
              <div className="discret" style={{ fontSize: 12.5 }}>
                {dateHeure(four.derniere_cuisson_le)}
                {four.derniere_temp_retenue != null && ` · palier ${temperature(four.derniere_temp_retenue)} · classe ${CLASSES[four.derniere_classe ?? 'inconnue']?.court}`}
              </div>
              {points.length > 1 && (
                <div style={{ marginTop: 8, marginInline: -8 }}>
                  <CourbeTemperature points={points} hauteur={110} />
                </div>
              )}
            </>
          ) : (
            <div className="discret">Aucune cuisson enregistrée</div>
          )}
        </div>
      )}

      <div className="carte-chiffres">
        <Chiffre valeur={String(four.nb_cuissons)} libelle="cuissons" />
        <Chiffre valeur={masseTexte(biochar)} libelle="biochar" />
        <Chiffre valeur={String(four.operateurs)} libelle="opérateurs" />
      </div>
      <div className="ligne-info">
        <span className="muet">Capteur</span>
        <span className="mono">{four.device_id ?? '—'}</span>
      </div>
      <div className="ligne-info">
        <span className="muet">Type</span>
        <span>{four.type}</span>
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        <Link to="/fours" className="bouton">
          <Flame size={15} /> Ouvrir le suivi en direct
        </Link>
        {!actif && (
          <button
            type="button"
            className="bouton braise"
            disabled={occupe}
            onClick={async () => {
              setOccupe(true)
              await envoyer(`/fours/${four.id}/simulation`, {}).catch(() => {})
              setOccupe(false)
            }}
          >
            <Play size={15} /> Simuler une cuisson
          </button>
        )}
      </div>
    </div>
  )
}

function DetailParcelle({ parcelle, lots, producteur }: { parcelle: Parcelle; lots: Lot[]; producteur?: Producteur }) {
  const siens = lots.filter((l) => l.parcelle_id === parcelle.id).sort((a, b) => b.maj_le.localeCompare(a.maj_le))
  const recu = lots.filter((l) => l.statut === 'epandu' && l.parcelle_destination_id === parcelle.id).reduce((a, l) => a + (l.masse_biochar_kg ?? 0), 0)
  const etat = etatParcelle(parcelle, lots)

  return (
    <div>
      <div className="etiquette">
        <MapPin size={11} style={{ verticalAlign: -1 }} /> Parcelle
      </div>
      <h3 style={{ fontSize: 22, marginTop: 6 }}>{parcelle.nom}</h3>
      <div className="muet" style={{ fontSize: 13 }}>
        {producteur?.nom} · {producteur?.village}
      </div>
      <div className="actions" style={{ marginTop: 8 }}>
        <span className="puce">
          <span className="point" style={{ background: etat.couleur }} />
          {etat.libelle}
        </span>
        {parcelle.demo && <BadgeDemo />}
      </div>

      <div className="carte-chiffres">
        <Chiffre valeur={parcelle.surface_ha ? `${nombre(parcelle.surface_ha, 1)} ha` : '—'} libelle="surface" />
        <Chiffre valeur={String(siens.length)} libelle="lots" />
        <Chiffre valeur={masseTexte(recu)} libelle="biochar reçu" />
      </div>
      <div className="ligne-info">
        <span className="muet">GPS</span>
        <span className="mono" style={{ fontSize: 12.5 }}>
          {parcelle.latitude.toFixed(5)}°, {parcelle.longitude.toFixed(5)}°
        </span>
      </div>

      <div className="etiquette" style={{ margin: '16px 0 8px' }}>
        Lots issus de cette parcelle
      </div>
      {siens.length === 0 ? (
        <div className="discret" style={{ fontSize: 13 }}>
          Aucun lot pour l'instant.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {siens.slice(0, 6).map((l) => (
            <Link key={l.id} to={`/lots/${l.id}`} className="carte-lot">
              <span className="mono">{l.code}</span>
              <PuceEtape statut={l.statut} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 17 }}>{valeur}</div>
      <div className="discret" style={{ fontSize: 11.5 }}>
        {libelle}
      </div>
    </div>
  )
}

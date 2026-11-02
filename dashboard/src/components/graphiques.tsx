import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { dateCourte, nombre } from '@/lib/format'
import { COULEURS, ETAPES } from '@/lib/theme'
import { STATUTS, type Statut } from '@/lib/types'

/** Largeur disponible d'un conteneur, suivie en continu. */
function useLargeur<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largeur, setLargeur] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(([e]) => setLargeur(e.contentRect.width))
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, largeur] as const
}

/** Pas « rond » (1, 2, 2,5, 5 × 10ⁿ) pour des graduations lisibles. */
function graduations(max: number, cible = 4): number[] {
  if (max <= 0) return [0, 1]
  const brut = max / cible
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut) ?? brut
  const ticks: number[] = []
  for (let v = 0; v < max + pas * 0.999; v += pas) ticks.push(Math.round(v * 1000) / 1000)
  return ticks
}

function Infobulle({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div className="infobulle" style={{ left: x, top: y }}>
      {children}
    </div>
  )
}

/** Bascule entre le graphique et sa version tableau (accessibilité, lecture exacte). */
export function useVueTableau() {
  const [tableau, setTableau] = useState(false)
  const bouton = (
    <button type="button" className="lien-donnees" onClick={() => setTableau((t) => !t)}>
      {tableau ? 'Voir le graphique' : 'Voir les données'}
    </button>
  )
  return [tableau, bouton] as const
}

// ---------- Colonnes par semaine ----------
export function ColonnesSemaines({
  serie,
  valeur,
  unite,
  couleur,
}: {
  serie: { semaine: string; lots: number; [k: string]: number | string }[]
  valeur: string
  unite: string
  couleur: string
}) {
  const [ref, largeur] = useLargeur<HTMLDivElement>()
  const [survol, setSurvol] = useState<number | null>(null)
  const H = 230
  const marge = { g: 44, d: 8, h: 12, b: 26 }
  const valeurs = serie.map((s) => Number(s[valeur]) || 0)
  const ticks = graduations(Math.max(...valeurs, 1))
  const yMax = ticks[ticks.length - 1]
  const zoneL = Math.max(0, largeur - marge.g - marge.d)
  const zoneH = H - marge.h - marge.b
  const bande = serie.length ? zoneL / serie.length : 0
  const larg = Math.min(24, bande * 0.56)
  const y = (v: number) => marge.h + zoneH * (1 - v / yMax)

  const colonne = (v: number, i: number) => {
    const x = marge.g + bande * i + (bande - larg) / 2
    const haut = y(v)
    const base = y(0)
    if (base - haut < 0.5) return null
    const r = Math.min(4, (base - haut) / 2, larg / 2)
    return `M${x},${base} L${x},${haut + r} Q${x},${haut} ${x + r},${haut} L${x + larg - r},${haut} Q${x + larg},${haut} ${x + larg},${haut + r} L${x + larg},${base} Z`
  }

  return (
    <div ref={ref} className="graphique" style={{ height: H }}>
      {largeur > 0 && (
        <svg width={largeur} height={H} role="img" aria-label={`Colonnes par semaine, en ${unite}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={marge.g} x2={largeur - marge.d} y1={y(t)} y2={y(t)} stroke={COULEURS.grille} strokeWidth={1} />
              <text x={marge.g - 10} y={y(t) + 4} textAnchor="end" fontSize={11} fill={COULEURS.axe} fontFamily="IBM Plex Mono" className="chiffres">
                {nombre(t)}
              </text>
            </g>
          ))}
          {serie.map((s, i) => {
            const d = colonne(valeurs[i], i)
            return (
              <g key={s.semaine}>
                {d && <path d={d} fill={couleur} opacity={survol === null || survol === i ? 1 : 0.45} />}
                {(i % 2 === serie.length % 2 || serie.length <= 6) && (
                  <text x={marge.g + bande * (i + 0.5)} y={H - 6} textAnchor="middle" fontSize={11} fill={COULEURS.axe} fontFamily="IBM Plex Sans">
                    {dateCourte(s.semaine)}
                  </text>
                )}
                <rect
                  x={marge.g + bande * i}
                  y={marge.h}
                  width={bande}
                  height={zoneH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`Semaine du ${dateCourte(s.semaine)} : ${nombre(valeurs[i], 1)} ${unite}`}
                  onPointerEnter={() => setSurvol(i)}
                  onPointerLeave={() => setSurvol(null)}
                  onFocus={() => setSurvol(i)}
                  onBlur={() => setSurvol(null)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {survol !== null && (
        <Infobulle x={marge.g + bande * (survol + 0.5)} y={y(valeurs[survol])}>
          <strong>
            {nombre(valeurs[survol], 1)} {unite}
          </strong>
          <span className="muet">
            Semaine du {dateCourte(serie[survol].semaine)} · {serie[survol].lots} lot{serie[survol].lots > 1 ? 's' : ''}
          </span>
        </Infobulle>
      )}
    </div>
  )
}

// ---------- Barre segmentée (une totalité, ses parts) ----------
const luminance = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function BarreEtapes({ comptes }: { comptes: Record<Statut, number> }) {
  const [survol, setSurvol] = useState<Statut | null>(null)
  const total = STATUTS.reduce((a, s) => a + (comptes[s] ?? 0), 0)
  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height: 28 }} role="img" aria-label={`Répartition de ${total} lots par étape`}>
        {STATUTS.filter((s) => comptes[s] > 0).map((s) => {
          const part = comptes[s] / total
          const couleur = ETAPES[s].couleur
          return (
            <div
              key={s}
              tabIndex={0}
              onPointerEnter={() => setSurvol(s)}
              onPointerLeave={() => setSurvol(null)}
              onFocus={() => setSurvol(s)}
              onBlur={() => setSurvol(null)}
              style={{
                flex: part,
                background: couleur,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                minWidth: 0,
                opacity: survol && survol !== s ? 0.5 : 1,
                position: 'relative',
              }}
            >
              {part * 100 >= 9 && (
                <span className="chiffres" style={{ fontSize: 12, fontWeight: 600, color: luminance(couleur) > 0.18 ? '#100F0D' : '#FFFDFA' }}>
                  {comptes[s]}
                </span>
              )}
              {survol === s && (
                <Infobulle x={0} y={0}>
                  <strong>
                    {comptes[s]} lot{comptes[s] > 1 ? 's' : ''} · {nombre((part * 100), 0)} %
                  </strong>
                  <span className="muet">{ETAPES[s].libelle}</span>
                </Infobulle>
              )}
            </div>
          )
        })}
      </div>
      <div className="legende">
        {STATUTS.map((s) => (
          <span key={s}>
            <span className="cle" style={{ background: ETAPES[s].couleur }} />
            {ETAPES[s].libelle}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- Barres horizontales (une seule série) ----------
export function BarresHorizontales({ lignes, couleur, unite }: { lignes: { libelle: string; valeur: number }[]; couleur: string; unite: string }) {
  const max = Math.max(...lignes.map((l) => l.valeur), 1)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {lignes.map((l) => (
        <div key={l.libelle} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: 12 }}>
          <span className="muet" style={{ fontSize: 13 }}>
            {l.libelle}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              title={`${l.libelle} : ${l.valeur} ${unite}`}
              style={{ width: `${(l.valeur / max) * 100}%`, minWidth: l.valeur ? 4 : 0, height: 14, background: couleur, borderRadius: '0 4px 4px 0' }}
            />
            <span className="chiffres" style={{ fontSize: 13, fontWeight: 600 }}>
              {l.valeur}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Courbe de température ----------
const Y_MAX = 800
const SEUILS = [
  { v: 450, t: '450 °C · carbonisation' },
  { v: 600, t: '600 °C · haute température' },
]

/** Courbe d'une cuisson : couleur liée à la température, réticule et lecture au survol. */
export function CourbeTemperature({
  points,
  hauteur = 260,
  enDirect,
  dureeMin = 30,
}: {
  points: [number, number][] // (minutes, °C)
  hauteur?: number
  enDirect?: boolean
  dureeMin?: number
}) {
  const [ref, largeur] = useLargeur<HTMLDivElement>()
  const [curseur, setCurseur] = useState<number | null>(null)
  const marge = { g: 44, d: 10, h: 14, b: 26 }
  const dernier = points[points.length - 1]
  const tMax = Math.max(dureeMin, dernier ? dernier[0] * 1.06 : 0)
  const zoneL = Math.max(0, largeur - marge.g - marge.d)
  const zoneH = hauteur - marge.h - marge.b
  const x = useCallback((t: number) => marge.g + (t / tMax) * zoneL, [tMax, zoneL])
  const y = (v: number) => marge.h + (1 - Math.min(Math.max(v, 0), Y_MAX) / Y_MAX) * zoneH

  const pas = Math.max(1, Math.floor(points.length / 600))
  const pts = points.filter((_, i) => i % pas === 0 || i === points.length - 1)
  const trace = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const aire = pts.length > 1 ? `${trace} L${x(pts[pts.length - 1][0]).toFixed(1)},${y(0)} L${x(pts[0][0]).toFixed(1)},${y(0)} Z` : ''
  const proche = curseur === null || !pts.length ? null : pts.reduce((a, p) => (Math.abs(p[0] - curseur) < Math.abs(a[0] - curseur) ? p : a))

  return (
    <div
      ref={ref}
      className="graphique"
      style={{ height: hauteur }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const px = e.clientX - r.left
        setCurseur(px < marge.g ? null : ((px - marge.g) / zoneL) * tMax)
      }}
      onPointerLeave={() => setCurseur(null)}
    >
      {largeur > 0 && (
        <svg width={largeur} height={hauteur} role="img" aria-label="Courbe de température de la cuisson">
          <defs>
            <linearGradient id="chaleur" x1="0" y1={y(Y_MAX)} x2="0" y2={y(0)} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#D44E17" />
              <stop offset="0.35" stopColor="#F2652A" />
              <stop offset="0.6" stopColor="#E3AE4A" />
              <stop offset="1" stopColor="#57514A" />
            </linearGradient>
          </defs>
          {[0, 200, 400, 600, 800].map((v) => (
            <g key={v}>
              {v === 0 && <line x1={marge.g} x2={largeur - marge.d} y1={y(0)} y2={y(0)} stroke={COULEURS.grille} />}
              <text x={marge.g - 10} y={y(v) + 4} textAnchor="end" fontSize={11} fill={COULEURS.axe} fontFamily="IBM Plex Mono">
                {v}
              </text>
            </g>
          ))}
          {/* Seuils de la méthode : pointillés, car ce sont des seuils et non une grille. */}
          {SEUILS.map((s) => (
            <line key={s.v} x1={marge.g} x2={largeur - marge.d} y1={y(s.v)} y2={y(s.v)} stroke="#3D3832" strokeDasharray="4 5" />
          ))}
          {[0, tMax / 2, tMax].map((t, i) => (
            <text key={i} x={x(t)} y={hauteur - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fontSize={11} fill={COULEURS.axe} fontFamily="IBM Plex Mono">
              {Math.round(t)} min
            </text>
          ))}
          {aire && <path d={aire} fill="#F2652A" opacity={0.12} />}
          {trace && <path d={trace} stroke="url(#chaleur)" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
          {/* Libellés des seuils dessinés après la courbe, sur un fond qui les garde lisibles. */}
          {SEUILS.map((s) => (
            <g key={s.v}>
              <rect x={largeur - marge.d - s.t.length * 6.1 - 10} y={y(s.v) - 17} width={s.t.length * 6.1 + 10} height={15} rx={4} fill={COULEURS.surface} opacity={0.92} />
              <text x={largeur - marge.d - 5} y={y(s.v) - 6} textAnchor="end" fontSize={10.5} fill={COULEURS.axe} fontFamily="IBM Plex Mono">
                {s.t}
              </text>
            </g>
          ))}
          {enDirect && dernier && (
            <g>
              <circle cx={x(dernier[0])} cy={y(dernier[1])} r={10} fill="#F2652A" className="halo" />
              <circle cx={x(dernier[0])} cy={y(dernier[1])} r={5} fill="#FF8A4C" stroke={COULEURS.surface} strokeWidth={2} />
            </g>
          )}
          {proche && (
            <g>
              <line x1={x(proche[0])} x2={x(proche[0])} y1={marge.h} y2={y(0)} stroke="#57514A" />
              <circle cx={x(proche[0])} cy={y(proche[1])} r={4.5} fill="#FFB37A" stroke={COULEURS.surface} strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {proche && (
        <Infobulle x={x(proche[0])} y={y(proche[1])}>
          <strong className="chiffres">{nombre(proche[1])} °C</strong>
          <span className="muet">à {nombre(proche[0], 1)} min</span>
        </Infobulle>
      )}
    </div>
  )
}

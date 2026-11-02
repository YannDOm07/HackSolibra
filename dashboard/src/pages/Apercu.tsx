import { ArrowUpRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { BadgeDemo, BadgeSource, EnTetePage, Panneau, PuceEtape, Tuile } from '@/components/base'
import { CarteTerrain } from '@/components/carte'
import { BarreEtapes, BarresHorizontales, ColonnesSemaines, useVueTableau } from '@/components/graphiques'
import { useDirect } from '@/lib/direct'
import { useApi } from '@/lib/donnees'
import { dateCourte, ilYa, masse, masseTexte, nombre, pourcent, temperature } from '@/lib/format'
import { CLASSES, COULEURS, PHASES } from '@/lib/theme'
import type { Four, Impact, Lot, Parcelle, Producteur } from '@/lib/types'

type Periode = 'tout' | '30j' | 'trimestre'

function debutPeriode(p: Periode): string {
  if (p === 'tout') return ''
  const d = new Date()
  const debut = p === '30j' ? new Date(d.getTime() - 30 * 86_400_000) : new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
  return `?debut=${debut.toISOString().slice(0, 19)}`
}

export function Apercu() {
  const navigate = useNavigate()
  const direct = useDirect()
  const [periode, setPeriode] = useState<Periode>('tout')
  const [mesure, setMesure] = useState<'biochar_kg' | 'co2_kg'>('biochar_kg')
  const [vueTableau, boutonTableau] = useVueTableau()

  const { donnees: impact, charge } = useApi<Impact>(`/impact${debutPeriode(periode)}`)
  const { donnees: lots = [] } = useApi<Lot[]>('/lots?limite=1000')
  const { donnees: fours = [] } = useApi<Four[]>('/fours')
  const { donnees: parcelles = [] } = useApi<Parcelle[]>('/parcelles', 60_000)
  const { donnees: producteurs = [] } = useApi<Producteur[]>('/producteurs', 60_000)
  const parId = useMemo(() => Object.fromEntries(producteurs.map((p) => [p.id, p])), [producteurs])

  if (!impact) return <EnTetePage surtitre="Coopérative pilote · Agnéby-Tiassa" titre="Vue d'ensemble" />

  const co2 = masse(impact.co2_kg)
  const classes = ['haute', 'moyenne', 'basse', 'insuffisante'].map((c) => ({ libelle: CLASSES[c].court, valeur: impact.classes[c] ?? 0 }))
  const partFemmes = impact.producteurs ? impact.productrices / impact.producteurs : null

  return (
    <div className={charge ? 'chargement' : ''}>
      <EnTetePage
        surtitre="Coopérative pilote · Agnéby-Tiassa"
        titre="Vue d'ensemble"
        actions={
          <>
            {impact.donnees_demo && <BadgeDemo />}
            <div className="segment" role="group" aria-label="Période">
              {(
                [
                  ['tout', 'Depuis le début'],
                  ['trimestre', 'Ce trimestre'],
                  ['30j', '30 derniers jours'],
                ] as [Periode, string][]
              ).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={periode === v} onClick={() => setPeriode(v)}>
                  {l}
                </button>
              ))}
            </div>
          </>
        }
      />

      <div className="grille">
        <section className="panneau heros s4">
          <div className="etiquette">CO₂ stocké dans les sols</div>
          <div className="heros-valeur">
            {co2.valeur}
            <small>{co2.unite === 't' ? 't CO₂' : 'kg CO₂'}</small>
          </div>
          <p className="muet" style={{ margin: '14px 0 0', fontSize: 13 }}>
            Estimation brute selon la méthode du GIEC (2019), à partir de {impact.cuissons} cuissons dont la température a été suivie.
          </p>
          <Link to="/methode" className="muet" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginTop: 14, fontSize: 13 }}>
            Comment c'est calculé <ArrowUpRight size={14} />
          </Link>
        </section>

        <div className="s8" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          <Tuile etiquette="Biochar produit" valeur={masse(impact.biochar_kg).valeur} unite={masse(impact.biochar_kg).unite} detail={`${impact.cuissons} cuissons`} />
          <Tuile
            etiquette="Cabosses valorisées"
            valeur={masse(impact.cabosses_kg).valeur}
            unite={masse(impact.cabosses_kg).unite}
            detail={`soit ${masseTexte(impact.matiere_seche_kg)} de matière sèche`}
          />
          <Tuile
            etiquette="Rendement moyen"
            valeur={pourcent(impact.rendement_moyen, 1)}
            detail="repère publié : 22 ± 5 %"
          />
          <Tuile etiquette="Hectares amendés" valeur={nombre(impact.hectares_amendes, 1)} unite="ha" detail={`sur ${nombre(impact.surface_ha, 1)} ha suivis`} />
          <Tuile etiquette="Producteurs" valeur={String(impact.producteurs)} detail={`dont ${impact.productrices} productrices (${pourcent(partFemmes)})`} />
          <Tuile etiquette="Emplois de jeunes" valeur={String(impact.emplois_jeunes)} detail={`opérateurs formés sur ${impact.fours} fours`} />
        </div>

        <Panneau
          className="s8"
          titre={mesure === 'biochar_kg' ? 'Biochar produit par semaine' : 'CO₂ stocké par semaine'}
          sousTitre="10 dernières semaines, selon la date de cuisson"
          action={
            <div className="actions">
              {boutonTableau}
              <div className="segment" role="group" aria-label="Mesure">
                <button type="button" aria-pressed={mesure === 'biochar_kg'} onClick={() => setMesure('biochar_kg')}>
                  Biochar
                </button>
                <button type="button" aria-pressed={mesure === 'co2_kg'} onClick={() => setMesure('co2_kg')}>
                  CO₂
                </button>
              </div>
            </div>
          }
        >
          {vueTableau ? (
            <table className="tableau">
              <thead>
                <tr>
                  <th>Semaine du</th>
                  <th className="nombre">Lots cuits</th>
                  <th className="nombre">Biochar (kg)</th>
                  <th className="nombre">CO₂ stocké (kg)</th>
                </tr>
              </thead>
              <tbody>
                {impact.serie_hebdo.map((s) => (
                  <tr key={s.semaine}>
                    <td>{dateCourte(s.semaine)}</td>
                    <td className="nombre">{s.lots}</td>
                    <td className="nombre">{nombre(s.biochar_kg, 1)}</td>
                    <td className="nombre">{nombre(s.co2_kg, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ColonnesSemaines
              serie={impact.serie_hebdo}
              valeur={mesure}
              unite={mesure === 'biochar_kg' ? 'kg de biochar' : 'kg de CO₂'}
              couleur={mesure === 'biochar_kg' ? COULEURS.braise : COULEURS.feuille}
            />
          )}
        </Panneau>

        <div className="s4" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panneau titre="Chaîne en cours" sousTitre={`${lots.length} lots, par étape`}>
            <BarreEtapes comptes={impact.lots_par_statut} />
          </Panneau>
          <Panneau titre="Classes de température" sousTitre="Cuissons terminées, classe GIEC mesurée">
            <BarresHorizontales lignes={classes} couleur={COULEURS.feuille} unite="cuissons" />
          </Panneau>
        </div>

        <Panneau className="s8" titre="Carte du terrain" sousTitre="Parcelles relevées au GPS et fours de la coopérative">
          <CarteTerrain parcelles={parcelles} fours={fours} lots={lots} producteurs={parId} direct={direct.fours} />
        </Panneau>

        <Panneau
          className="s4"
          titre="Fours"
          action={
            <Link to="/fours" className="muet" style={{ fontSize: 13, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              Direct <ArrowUpRight size={14} />
            </Link>
          }
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {fours.map((f) => {
              const etat = direct.fours[f.id]
              const phase = PHASES[etat?.phase ?? 'en_attente']
              return (
                <Link key={f.id} to="/fours" className="panneau" style={{ padding: 14, background: etat ? '#221F1B' : undefined, borderColor: etat ? '#5a2a14' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.nom}</div>
                      <div className="discret mono" style={{ fontSize: 12 }}>
                        {f.code}
                      </div>
                    </div>
                    {etat ? (
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: '#FFB37A' }}>
                          {temperature(etat.temp)}
                        </div>
                        <div className="etat" style={{ justifyContent: 'flex-end', fontSize: 12.5 }}>
                          <span className="point vivant" style={{ background: phase.couleur, color: phase.couleur }} />
                          {phase.libelle}
                        </div>
                      </div>
                    ) : (
                      <span className="discret" style={{ fontSize: 13 }}>
                        Au repos
                      </span>
                    )}
                  </div>
                  {etat && (
                    <div style={{ marginTop: 8 }}>
                      <BadgeSource source={etat.source} />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </Panneau>

        <Panneau
          className="s12"
          titre="Derniers lots"
          action={
            <Link to="/lots" className="muet" style={{ fontSize: 13, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              Tous les lots <ArrowUpRight size={14} />
            </Link>
          }
        >
          <table className="tableau">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Producteur</th>
                <th>Étape</th>
                <th className="nombre">Cabosses</th>
                <th className="nombre">Biochar</th>
                <th className="nombre">CO₂ stocké</th>
                <th className="nombre">Mis à jour</th>
              </tr>
            </thead>
            <tbody>
              {lots.slice(0, 8).map((l) => (
                <tr key={l.id} className="cliquable" onClick={() => navigate(`/lots/${l.id}`)}>
                  <td className="mono">{l.code}</td>
                  <td>
                    {l.producteur_nom}
                    <span className="discret"> · {l.village}</span>
                  </td>
                  <td>
                    <PuceEtape statut={l.statut} />
                  </td>
                  <td className="nombre">{masseTexte(l.masse_cabosses_kg)}</td>
                  <td className="nombre">{masseTexte(l.masse_biochar_kg)}</td>
                  <td className="nombre">{l.co2_kg ? `${nombre(l.co2_kg, 1)} kg` : '—'}</td>
                  <td className="nombre discret">{ilYa(l.maj_le)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panneau>
      </div>
    </div>
  )
}

import { Cpu, Play, Square, TriangleAlert, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { BadgeDemo, BadgeSource, EnTetePage, Panneau, Vide } from '@/components/base'
import { CourbeTemperature } from '@/components/graphiques'
import { envoyer } from '@/lib/api'
import { useCuisson } from '@/lib/cuisson'
import { useDirect, type EtatFour } from '@/lib/direct'
import { useApi } from '@/lib/donnees'
import { chrono, dateHeure, duree, ilYa, nombre, temperature } from '@/lib/format'
import { CLASSES, PHASES } from '@/lib/theme'
import type { Cuisson, Four } from '@/lib/types'

const ORDRE = ['allumage', 'carbonisation', 'extinction', 'terminee']
const F_PERM: Record<string, number> = { haute: 0.89, moyenne: 0.8, basse: 0.65 }

export function Fours() {
  const { fours: direct, capteurs } = useDirect()
  const { donnees: fours = [], recharger } = useApi<Four[]>('/fours')
  const liste = [...fours].sort((a, b) => Number(!!direct[b.id]) - Number(!!direct[a.id]) || a.code.localeCompare(b.code))

  return (
    <div>
      <EnTetePage surtitre={`${Object.keys(direct).length} en cuisson · ${fours.length} fours`} titre="Fours en direct" />
      <div style={{ display: 'grid', gap: 16 }}>
        {liste.map((f) => (
          <PanneauFour key={f.id} four={f} etat={direct[f.id]} onAction={recharger} />
        ))}
      </div>

      <div style={{ height: 16 }} />
      <Panneau titre="Capteurs détectés" sousTitre="Mesures reçues hors cuisson : c'est ici que l'on vérifie un thermocouple (eau bouillante ≈ 100 °C).">

        {Object.values(capteurs).length === 0 ? (
          <Vide>
            Aucun capteur en mode vérification. Une carte ESP32 envoie <span className="mono">POST /api/v1/mesures</span> avec l'en-tête{' '}
            <span className="mono">X-Device-Key</span> ; ses mesures apparaissent ici en direct.
          </Vide>
        ) : (
          <table className="tableau">
            <thead>
              <tr>
                <th>Capteur</th>
                <th>Four associé</th>
                <th className="nombre">Thermocouple</th>
                <th className="nombre">Carte (soudure froide)</th>
                <th className="nombre">Dernière mesure</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(capteurs).map((c) => (
                <tr key={c.device_id}>
                  <td className="mono">
                    <Cpu size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                    {c.device_id}
                  </td>
                  <td>{fours.find((f) => f.id === c.four_id)?.nom ?? <span className="discret">aucun</span>}</td>
                  <td className="nombre mono" style={{ fontSize: 15, fontWeight: 600 }}>
                    {nombre(c.temp, 1)} °C
                  </td>
                  <td className="nombre mono">{temperature(c.temp_interne)}</td>
                  <td className="nombre discret">{ilYa(c.recu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panneau>
    </div>
  )
}

function PanneauFour({ four, etat, onAction }: { four: Four; etat?: EtatFour; onAction: () => void }) {
  const actif = etat?.cuisson_id ?? four.cuisson_active_id
  const { donnees: historique = [] } = useApi<Cuisson[]>(`/cuissons?four_id=${four.id}&limite=1&statut=terminee`, 0)
  const cuissonAffichee = actif ?? historique[0]?.id
  const { detail, points } = useCuisson(cuissonAffichee)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const agir = async (f: () => Promise<unknown>) => {
    setOccupe(true)
    setErreur(null)
    try {
      await f()
      onAction()
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setOccupe(false)
    }
  }

  const dernier = points[points.length - 1]
  const phase = etat?.phase ?? detail?.analyse.phase ?? 'en_attente'
  const analyse = detail?.analyse

  return (
    <section className="panneau" style={actif ? { borderColor: '#5a2a14', background: 'radial-gradient(90% 120% at 100% 0%, rgba(212,78,23,0.16), transparent 60%), #181613' } : undefined}>
      <div className="panneau-tete">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>{four.nom}</h2>
            {four.demo && <BadgeDemo />}
            {actif && <BadgeSource source={etat?.source ?? detail?.source} />}
          </div>
          <p>
            <span className="mono">{four.code}</span> · {four.village} · {four.type} ·{' '}
            <Users size={13} style={{ verticalAlign: -2 }} /> {four.operateurs} opérateurs ·{' '}
            <Cpu size={13} style={{ verticalAlign: -2 }} /> <span className="mono">{four.device_id ?? 'sans capteur'}</span>
          </p>
        </div>
        <div className="actions">
          {actif ? (
            <button type="button" className="bouton" disabled={occupe} onClick={() => agir(() => envoyer(`/cuissons/${actif}/terminer`))}>
              <Square size={15} /> Terminer la cuisson
            </button>
          ) : (
            <>
              <button type="button" className="bouton" disabled={occupe} onClick={() => agir(() => envoyer('/cuissons', { four_id: four.id }))}>
                <Cpu size={15} /> Démarrer avec le capteur
              </button>
              <button type="button" className="bouton braise" disabled={occupe} onClick={() => agir(() => envoyer(`/fours/${four.id}/simulation`, {}))}>
                <Play size={15} /> Simuler une cuisson
              </button>
            </>
          )}
        </div>
      </div>
      {erreur && <div className="alerte">{erreur}</div>}

      {!cuissonAffichee ? (
        <Vide>Aucune cuisson enregistrée sur ce four.</Vide>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
          <div>
            <div className="etiquette" style={{ marginBottom: 6 }}>
              {actif ? 'Cuisson en cours' : `Dernière cuisson · ${dateHeure(detail?.debut)}`}
              {detail?.lot_id && (
                <>
                  {' · '}
                  <Link to={`/lots/${detail.lot_id}`} style={{ textDecoration: 'underline' }}>
                    voir le lot
                  </Link>
                </>
              )}
            </div>
            <CourbeTemperature points={points} enDirect={!!actif} dureeMin={actif ? 120 : 30} hauteur={270} />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div className="etiquette">{actif ? 'Température' : 'Palier retenu'}</div>
              <div className="mono" style={{ fontSize: 46, fontWeight: 600, lineHeight: 1.1, color: actif ? '#FFB37A' : undefined, marginTop: 4 }}>
                {actif ? temperature(dernier?.[1]) : temperature(analyse?.temp_retenue)}
              </div>
              {actif && <div className="muet mono">durée {chrono((dernier?.[0] ?? 0) * 60)}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {ORDRE.map((p, i) => {
                const rang = ORDRE.indexOf(phase)
                const fait = i < rang || phase === 'terminee'
                const courant = p === phase
                return (
                  <div
                    key={p}
                    title={PHASES[p].libelle}
                    style={{
                      flex: 1,
                      padding: '7px 8px',
                      borderRadius: 9,
                      fontSize: 11.5,
                      fontWeight: 600,
                      border: `1px solid ${courant ? PHASES[p].couleur : '#2E2A25'}`,
                      color: courant ? '#F5EFE6' : fait ? '#A39B90' : '#57514A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {PHASES[p].libelle}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Mini etiquette={actif ? 'Palier (médiane)' : 'Température max.'} valeur={actif ? temperature(analyse?.temp_retenue) : temperature(analyse?.temp_max)} />
              <Mini etiquette="Carbonisation" valeur={duree(analyse?.duree_carbonisation_min)} />
              <Mini etiquette="Ajouts détectés" valeur={analyse ? String(analyse.couches) : '—'} />
              <Mini
                etiquette="Classe GIEC"
                valeur={CLASSES[analyse?.classe ?? 'inconnue']?.court ?? '—'}
                detail={analyse && F_PERM[analyse.classe] ? `F_perm ${nombre(F_PERM[analyse.classe], 2)}` : undefined}
              />
            </div>
            {analyse?.alertes.map((a) => (
              <div key={a} className="alerte" style={{ marginTop: 0 }}>
                <TriangleAlert size={15} style={{ flex: 'none', marginTop: 2, color: '#FFB37A' }} />
                {a}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Mini({ etiquette, valeur, detail }: { etiquette: string; valeur: string; detail?: string }) {
  return (
    <div style={{ background: '#1D1B18', border: '1px solid #2E2A25', borderRadius: 12, padding: '10px 12px' }}>
      <div className="etiquette" style={{ fontSize: 9.5 }}>
        {etiquette}
      </div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>
        {valeur}
      </div>
      {detail && (
        <div className="discret" style={{ fontSize: 11.5 }}>
          {detail}
        </div>
      )}
    </div>
  )
}

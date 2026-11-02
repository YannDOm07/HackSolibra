import { ArrowLeft, Hash, TriangleAlert } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router'

import { BadgeDemo, BadgeSource, LigneInfo, Panneau, PuceEtape } from '@/components/base'
import { CourbeTemperature } from '@/components/graphiques'
import { mediaUrl } from '@/lib/api'
import { useApi } from '@/lib/donnees'
import { dateHeure, duree, masse, nombre, pourcent, temperature } from '@/lib/format'
import { CLASSES, ETAPES } from '@/lib/theme'
import type { Passeport, Photo } from '@/lib/types'

export function Lot() {
  const { id } = useParams()
  const { donnees: p, erreur } = useApi<Passeport>(`/lots/${id}/passeport`, 15_000)
  const { donnees: photos = [] } = useApi<Photo[]>(`/photos?lot_id=${id}`, 60_000)

  if (erreur) return <div className="alerte">{erreur}</div>
  if (!p) return null
  const { lot, carbone, cuisson, verification } = p

  return (
    <div>
      <Link to="/lots" className="muet" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18, fontSize: 13 }}>
        <ArrowLeft size={15} /> Tous les lots
      </Link>
      <div className="grille">
        <div className="s4" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className="panneau heros">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div className="etiquette">Passeport du lot</div>
                <div className="mono" style={{ fontSize: 30, fontWeight: 600, marginTop: 8 }}>
                  {lot.code}
                </div>
                <div style={{ fontWeight: 600, marginTop: 12 }}>{p.producteur.nom}</div>
                <div className="muet" style={{ fontSize: 13 }}>
                  {p.producteur.village}
                  {p.parcelle ? ` · ${p.parcelle.nom}` : ''}
                </div>
                <div className="actions" style={{ marginTop: 14 }}>
                  <PuceEtape statut={lot.statut} />
                  {lot.demo && <BadgeDemo />}
                </div>
              </div>
              <div style={{ background: '#FFFDFA', padding: 8, borderRadius: 12, alignSelf: 'flex-start' }}>
                <QRCodeSVG value={`KABOCHAR:${lot.code}`} size={96} bgColor="#FFFDFA" fgColor="#181613" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px dashed #3D3832' }}>
              <Masse etiquette="Cabosses" kg={lot.masse_cabosses_kg} />
              <Masse etiquette="Biochar" kg={lot.masse_biochar_kg} />
              <Masse etiquette="CO₂ stocké" kg={lot.masse_biochar_kg ? carbone.co2_kg : null} />
            </div>
          </section>

          <Panneau titre="Parcours">
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {p.etapes.map((e, i) => (
                <li key={e.cle} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                    <span
                      className="point"
                      style={{ width: 12, height: 12, marginTop: 4, background: e.faite ? ETAPES[e.cle].couleur : 'transparent', border: `2px solid ${e.faite ? ETAPES[e.cle].couleur : '#3D3832'}` }}
                    />
                    {i < p.etapes.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 22, background: p.etapes[i + 1].faite ? ETAPES[e.cle].couleur : '#2E2A25', margin: '3px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div style={{ fontWeight: 600, color: e.faite ? undefined : '#7A736A' }}>{ETAPES[e.cle].libelle}</div>
                    <div className="mono discret" style={{ fontSize: 12 }}>
                      {e.date ? dateHeure(e.date) : 'à venir'}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            {lot.statut === 'epandu' && p.parcelle_destination && (
              <div className="muet" style={{ fontSize: 13 }}>
                Biochar épandu sur « {p.parcelle_destination.nom} »
                {p.parcelle_destination.id === p.parcelle?.id ? ' : la parcelle d’origine, la boucle est fermée.' : '.'}
              </div>
            )}
          </Panneau>

          <Panneau titre="Vérification">
            <LigneInfo etiquette="Mesures du four">
              {nombre(verification.nb_mesures)} <BadgeSource source={verification.source_temperature} />
            </LigneInfo>
            <LigneInfo etiquette="Données">{verification.donnees_demo ? 'Démonstration' : 'Terrain'}</LigneInfo>
            <div className="etiquette" style={{ marginTop: 14 }}>
              <Hash size={12} style={{ verticalAlign: -2 }} /> Empreinte SHA-256
            </div>
            <div className="mono" style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 6, color: '#A39B90' }}>
              {verification.empreinte_sha256}
            </div>
            <p className="discret" style={{ fontSize: 12.5, marginBottom: 0 }}>
              Calculée à partir des pesées, des dates et de la cuisson : toute modification la change.
            </p>
          </Panneau>
        </div>

        <div className="s8" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Panneau
            titre={cuisson ? `Cuisson · ${p.four?.nom ?? 'four'}` : 'Cuisson'}
            sousTitre={cuisson ? dateHeure(cuisson.debut) : 'Pas encore enfourné'}
            action={cuisson ? <BadgeSource source={cuisson.source} /> : undefined}
          >
            {cuisson ? (
              <>
                <CourbeTemperature points={cuisson.courbe} enDirect={cuisson.statut === 'en_cours'} hauteur={280} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14 }}>
                  <Indicateur etiquette="Palier retenu" valeur={temperature(cuisson.analyse.temp_retenue)} />
                  <Indicateur etiquette="Carbonisation" valeur={duree(cuisson.analyse.duree_carbonisation_min)} />
                  <Indicateur etiquette="Ajouts de cabosses" valeur={String(cuisson.analyse.couches)} />
                  <Indicateur etiquette="Rendement" valeur={pourcent(lot.rendement, 1)} />
                </div>
                {cuisson.analyse.alertes.map((a) => (
                  <div key={a} className="alerte">
                    <TriangleAlert size={15} style={{ flex: 'none', marginTop: 2, color: '#FFB37A' }} />
                    {a}
                  </div>
                ))}
              </>
            ) : (
              <p className="muet">La courbe apparaîtra dès que le lot sera enfourné.</p>
            )}
          </Panneau>

          <Panneau titre="Bilan carbone" sousTitre={carbone.nature}>
            {lot.masse_biochar_kg ? (
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.03em', color: '#8CC3A0' }}>
                    {nombre(carbone.co2_kg, 1)}
                    <span style={{ fontSize: 18, marginLeft: 6, color: '#A39B90' }}>kg CO₂</span>
                  </div>
                  <div className="muet" style={{ fontSize: 13 }}>
                    {CLASSES[carbone.classe]?.libelle}
                  </div>
                </div>
                <div>
                  <div className="formule">
                    {nombre(carbone.masse_biochar_kg, 1)} kg × {nombre(carbone.f_c, 2)} × {nombre(carbone.f_perm, 2)} × 44/12 = {nombre(carbone.co2_kg, 1)} kg
                  </div>
                  <div className="discret" style={{ fontSize: 12.5, marginTop: 8 }}>
                    biochar sec × carbone (F_C) × permanence à 100 ans (F_perm, selon la température mesurée) × rapport CO₂/C · {carbone.reference}
                  </div>
                </div>
              </div>
            ) : (
              <p className="muet">Le bilan s'affichera après la pesée du biochar.</p>
            )}
          </Panneau>

          {photos.length > 0 && (
            <Panneau titre="Photos du terrain" sousTitre="Horodatées et rattachées au lot">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {photos.map((ph) => (
                  <figure key={ph.id} style={{ margin: 0 }}>
                    <img src={mediaUrl(ph.url)} alt={`Photo ${ph.type}`} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 12 }} />
                    <figcaption className="discret" style={{ fontSize: 12, marginTop: 4 }}>
                      {ph.type} · {dateHeure(ph.prise_le)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Panneau>
          )}
        </div>
      </div>
    </div>
  )
}

function Masse({ etiquette, kg }: { etiquette: string; kg: number | null }) {
  const m = masse(kg)
  return (
    <div>
      <div className="etiquette" style={{ fontSize: 9.5 }}>
        {etiquette}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
        {m.valeur}
        <span className="muet" style={{ fontSize: 12, marginLeft: 4 }}>
          {m.unite}
        </span>
      </div>
    </div>
  )
}

function Indicateur({ etiquette, valeur }: { etiquette: string; valeur: string }) {
  return (
    <div>
      <div className="etiquette" style={{ fontSize: 9.5 }}>
        {etiquette}
      </div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
        {valeur}
      </div>
    </div>
  )
}

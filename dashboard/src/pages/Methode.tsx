import { ArrowUpRight, Cpu, FlaskConical, Landmark, LineChart, Shuffle, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { EnTetePage, Panneau } from '@/components/base'
import { useApi } from '@/lib/donnees'
import { nombre } from '@/lib/format'
import type { Meta, Reference } from '@/lib/types'

// Échelle de température : de 300 à 800 °C. Plus la carbonisation est chaude, plus le carbone est stable.
const T_MIN = 300
const T_MAX = 800
const SEGMENTS = [
  { de: 300, a: 350, libelle: '< 350', f: null, couleur: '#3D3832' },
  { de: 350, a: 450, libelle: 'Basse', f: 0.65, couleur: '#2F5A44' },
  { de: 450, a: 600, libelle: 'Moyenne', f: 0.8, couleur: '#2F7049' },
  { de: 600, a: 800, libelle: 'Haute', f: 0.89, couleur: '#3D8C5F' },
]
const pos = (t: number) => `${((t - T_MIN) / (T_MAX - T_MIN)) * 100}%`

function typeDeSource(r: Reference): { libelle: string; icone: typeof Landmark } {
  if (r.cle.includes('giec')) return { libelle: 'Méthode officielle', icone: Landmark }
  if (r.cle.includes('prix')) return { libelle: 'Marché', icone: LineChart }
  return { libelle: 'Étude scientifique', icone: FlaskConical }
}

export function Methode() {
  const { donnees: meta } = useApi<Meta>('/meta', 0)
  if (!meta) return <EnTetePage surtitre="Transparence" titre="Méthode et sources" />

  return (
    <div>
      <EnTetePage surtitre="Transparence" titre="Méthode et sources" />
      <div className="grille">
        <Panneau className="s12" titre="Combien de CO₂ un lot stocke-t-il ?" sousTitre={`${meta.methode.reference} · ${meta.methode.nature}`}>
          <div className="formule-tuiles">
            <Facteur valeur="m" titre="Biochar sec" detail="pesé après la cuisson (kg)" />
            <Operateur>×</Operateur>
            <Facteur valeur={nombre(meta.methode.f_c_defaut, 2)} titre="Carbone F_C" detail="valeur prudente avant analyse" />
            <Operateur>×</Operateur>
            <Facteur valeur="F_perm" titre="Permanence" detail="part restant après 100 ans, selon la température mesurée" accent />
            <Operateur>×</Operateur>
            <Facteur valeur="44/12" titre="CO₂ / C" detail="masse de CO₂ par masse de carbone" />
            <Operateur>=</Operateur>
            <Facteur valeur="CO₂" titre="Stocké" detail="estimation brute, par lot" resultat />
          </div>
          <p className="muet" style={{ fontSize: 13, margin: '14px 0 0' }}>
            {meta.methode.f_c_justification}
          </p>
        </Panneau>

        <Panneau className="s8" titre="La température mesurée fixe la permanence" sousTitre="Classes du GIEC (2019) et coefficient F_perm associé">
          <div className="echelle">
            <div className="echelle-barre">
              {SEGMENTS.map((s) => (
                <div key={s.de} className="echelle-segment" style={{ left: pos(s.de), width: `calc(${pos(s.a)} - ${pos(s.de)} - 2px)`, background: s.couleur }}>
                  <span className="echelle-classe">{s.libelle}</span>
                  {s.f && <span className="echelle-f">F_perm {nombre(s.f, 2)}</span>}
                </div>
              ))}
              <div className="echelle-plage" style={{ left: pos(680), width: `calc(${pos(750)} - ${pos(680)})` }} title="Zone de pyrolyse d'un four Kon-Tiki (Cornelissen et al. 2016)" />
            </div>
            <div className="echelle-axe">
              {[300, 350, 450, 600, 680, 750, 800].map((t) => (
                <span
                  key={t}
                  style={{ left: pos(t), color: t === 680 || t === 750 ? '#FFB37A' : undefined, transform: t === T_MIN ? 'none' : t === T_MAX ? 'translateX(-100%)' : undefined }}
                >
                  {t} °C
                </span>
              ))}
            </div>
          </div>
          <p className="muet" style={{ fontSize: 13, marginBottom: 0 }}>
            <span className="cle" style={{ background: '#F2652A', verticalAlign: -1, marginRight: 6 }} />
            Zone de pyrolyse mesurée dans les fours Kon-Tiki (680–750 °C, Cornelissen et al. 2016). La plateforme retient la{' '}
            <b style={{ color: '#F5EFE6' }}>médiane</b> des températures de carbonisation, plus prudente que le maximum.
          </p>
          <div className="reperes">
            <Repere valeur="350 °C" texte="seuil du GIEC : en dessous, ce n'est pas du biochar" />
            <Repere valeur="680–750 °C" texte="four Kon-Tiki : classe haute, F_perm 0,89" />
            <Repere valeur="1 350 °C" texte="plage du capteur MAX31855 : largement suffisante" />
          </div>
        </Panneau>

        <Panneau className="s4" titre="Ce qui est mesuré, simulé ou fictif">
          <div style={{ display: 'grid', gap: 12 }}>
            <Statut icone={<Cpu size={16} />} badge={<span className="badge capteur">Capteur</span>}>
              Températures du thermocouple monté sur le four.
            </Statut>
            <Statut icone={<Shuffle size={16} />} badge={<span className="badge sim">Simulation</span>}>
              Courbes de démonstration, calées sur les températures publiées.
            </Statut>
            <Statut icone={<Users size={16} />} badge={<span className="badge">Démo</span>}>
              Producteurs, parcelles et lots fictifs, villages réels.
            </Statut>
          </div>
        </Panneau>

        <Panneau className="s12" titre="Valeurs publiées utilisées" sousTitre="Chaque chiffre affiché par la plateforme renvoie à sa source.">
          <div className="sources">
            {meta.references.map((r) => {
              const t = typeDeSource(r)
              return (
                <a key={r.cle} href={r.url} target="_blank" rel="noreferrer" className="source">
                  <span className="source-type">
                    <t.icone size={13} /> {t.libelle}
                  </span>
                  <span className="source-valeur">{r.valeur}</span>
                  <span className="source-ref">
                    {r.source} <ArrowUpRight size={13} />
                  </span>
                </a>
              )
            })}
          </div>
        </Panneau>
      </div>
    </div>
  )
}

function Facteur({ valeur, titre, detail, accent, resultat }: { valeur: string; titre: string; detail: string; accent?: boolean; resultat?: boolean }) {
  return (
    <div className={`facteur${accent ? ' accent' : ''}${resultat ? ' resultat' : ''}`}>
      <div className="facteur-valeur">{valeur}</div>
      <div className="facteur-titre">{titre}</div>
      <div className="facteur-detail">{detail}</div>
    </div>
  )
}

const Operateur = ({ children }: { children: ReactNode }) => <div className="operateur">{children}</div>

function Statut({ icone, badge, children }: { icone: ReactNode; badge: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 12, background: '#1D1B18', border: '1px solid #2E2A25' }}>
      <span className="muet" style={{ marginTop: 2 }}>
        {icone}
      </span>
      <div>
        {badge}
        <div className="muet" style={{ fontSize: 13, marginTop: 6 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Repere({ valeur, texte }: { valeur: string; texte: string }) {
  return (
    <div className="repere">
      <div className="mono" style={{ fontSize: 17, fontWeight: 600 }}>
        {valeur}
      </div>
      <div className="muet" style={{ fontSize: 12.5, marginTop: 2 }}>
        {texte}
      </div>
    </div>
  )
}

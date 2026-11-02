import { Printer } from 'lucide-react'
import { useState } from 'react'

import { EnTetePage } from '@/components/base'
import { useApi } from '@/lib/donnees'
import { dateLongue, masseTexte, nombre, pourcent } from '@/lib/format'
import { CLASSES, ETAPES } from '@/lib/theme'
import type { Rapport as TRapport } from '@/lib/types'

// Indice biochar Puro.earth / Nasdaq (CORCCHAR), septembre 2026 : docs/references.md, §8.
const PRIX_CO2_EUR = 124.02

export function Rapport() {
  const maintenant = new Date()
  const [annee, setAnnee] = useState(maintenant.getFullYear())
  const [trimestre, setTrimestre] = useState(Math.floor(maintenant.getMonth() / 3) + 1)
  const { donnees: r, charge } = useApi<TRapport>(`/rapports/trimestriel?annee=${annee}&trimestre=${trimestre}`, 0)

  return (
    <div>
      <div className="sans-impression">
        <EnTetePage
          surtitre="Article 10 du règlement CNID"
          titre="Rapport trimestriel"
          actions={
            <>
              <div className="segment" role="group" aria-label="Trimestre">
                {[1, 2, 3, 4].map((t) => (
                  <button key={t} type="button" aria-pressed={trimestre === t} onClick={() => setTrimestre(t)}>
                    T{t}
                  </button>
                ))}
              </div>
              <div className="segment" role="group" aria-label="Année">
                {[maintenant.getFullYear() - 1, maintenant.getFullYear()].map((a) => (
                  <button key={a} type="button" aria-pressed={annee === a} onClick={() => setAnnee(a)}>
                    {a}
                  </button>
                ))}
              </div>
              <button type="button" className="bouton braise" onClick={() => window.print()}>
                <Printer size={16} /> Imprimer ou enregistrer en PDF
              </button>
            </>
          }
        />
        <p className="muet" style={{ marginTop: -8, marginBottom: 22 }}>
          Généré automatiquement à partir des données de la plateforme : indicateurs environnementaux, sociaux et économiques demandés par
          SOLIBRA et le MINETE pour le suivi de la phase pilote.
        </p>
      </div>

      {r && (
        <article className={`document ${charge ? 'chargement' : ''}`}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
            <div>
              <div className="etiquette">KaboChar · Rapport d'activité de la phase pilote</div>
              <h1 style={{ marginTop: 6 }}>{r.titre}</h1>
              <div className="discret" style={{ marginTop: 4 }}>
                Période du {dateLongue(r.periode.debut)} au {dateLongue(new Date(new Date(r.periode.fin).getTime() - 86_400_000).toISOString())} ·
                généré le {dateLongue(r.genere_le)}
              </div>
            </div>
            <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden>
              <rect width="64" height="64" rx="16" fill="#181613" />
              <circle cx="32" cy="32" r="14" fill="none" stroke="#F2652A" strokeWidth="6" />
              <circle cx="32" cy="32" r="5" fill="#FFB37A" />
            </svg>
          </header>
          <p className="discret" style={{ marginTop: 10 }}>
            Destinataires : comité de coordination SOLIBRA / Ministère de l'Environnement et de la Transition Écologique.
          </p>
          {r.indicateurs.donnees_demo && (
            <p style={{ padding: '8px 12px', border: '1px dashed #C98F2A', borderRadius: 8, background: '#FBF3E3' }}>
              Données de démonstration : ce rapport illustre le format ; il sera alimenté par les données réelles du pilote.
            </p>
          )}

          <h2>Indicateurs environnementaux</h2>
          <div className="indicateurs">
            <Indicateur libelle="Cabosses valorisées" valeur={masseTexte(r.indicateurs.cabosses_kg)} />
            <Indicateur libelle="Biochar produit" valeur={masseTexte(r.indicateurs.biochar_kg)} />
            <Indicateur libelle="CO₂ stocké (estimation brute)" valeur={masseTexte(r.indicateurs.co2_kg)} />
            <Indicateur libelle="Hectares amendés" valeur={`${nombre(r.indicateurs.hectares_amendes, 1)} ha`} />
            <Indicateur libelle="Cuissons suivies" valeur={String(r.indicateurs.cuissons)} />
            <Indicateur libelle="Rendement moyen" valeur={pourcent(r.indicateurs.rendement_moyen, 1)} />
          </div>

          <h2>Indicateurs sociaux</h2>
          <div className="indicateurs">
            <Indicateur libelle="Producteurs servis" valeur={String(r.indicateurs.producteurs)} />
            <Indicateur
              libelle="dont productrices"
              valeur={`${r.indicateurs.productrices} (${pourcent(r.indicateurs.producteurs ? r.indicateurs.productrices / r.indicateurs.producteurs : null)})`}
            />
            <Indicateur libelle="Emplois de jeunes (opérateurs)" valeur={String(r.indicateurs.emplois_jeunes)} />
          </div>

          <h2>Indicateurs économiques</h2>
          <div className="indicateurs">
            <Indicateur libelle="Lots traités" valeur={String(r.lots.length)} />
            <Indicateur libelle="Biochar disponible pour la vente" valeur={masseTexte(r.lots.filter((l) => l.statut === 'enrichissement').reduce((a, l) => a + (l.masse_biochar_kg ?? 0), 0))} />
            <Indicateur libelle="Valeur carbone indicative" valeur={`${nombre((r.indicateurs.co2_kg / 1000) * PRIX_CO2_EUR)} €`} />
          </div>
          <p className="discret" style={{ fontSize: 11 }}>
            Valeur carbone indicative : CO₂ stocké × {nombre(PRIX_CO2_EUR, 2)} € par tonne (indice biochar CORCCHAR de Puro.earth, septembre 2026). Elle n'est
            pas perçue : les crédits exigent une certification, qui déduit en outre les émissions du procédé.
          </p>

          <h2>Qualité des cuissons</h2>
          <table>
            <thead>
              <tr>
                <th>Classe de température (GIEC)</th>
                <th className="nombre">Cuissons</th>
              </tr>
            </thead>
            <tbody>
              {['haute', 'moyenne', 'basse', 'insuffisante'].map((c) => (
                <tr key={c}>
                  <td>{CLASSES[c].libelle}</td>
                  <td className="nombre">{r.indicateurs.classes[c] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.alertes.length > 0 && (
            <>
              <p style={{ marginBottom: 4 }}>
                <b>Alertes relevées</b>
              </p>
              <ul style={{ marginTop: 0 }}>
                {r.alertes.map((a, i) => (
                  <li key={i}>
                    {a.lot} : {a.alerte}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2>Lots de la période</h2>
          <table>
            <thead>
              <tr>
                <th>Lot</th>
                <th>Producteur</th>
                <th>Étape</th>
                <th className="nombre">Cabosses</th>
                <th className="nombre">Biochar</th>
                <th>Classe</th>
                <th className="nombre">CO₂</th>
              </tr>
            </thead>
            <tbody>
              {r.lots.map((l) => (
                <tr key={l.id}>
                  <td className="mono">{l.code}</td>
                  <td>{l.producteur_nom}</td>
                  <td>{ETAPES[l.statut].libelle}</td>
                  <td className="nombre">{masseTexte(l.masse_cabosses_kg)}</td>
                  <td className="nombre">{masseTexte(l.masse_biochar_kg)}</td>
                  <td>{l.classe && l.classe !== 'inconnue' ? CLASSES[l.classe]?.court : '—'}</td>
                  <td className="nombre">{l.co2_kg ? `${nombre(l.co2_kg, 1)} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Méthode</h2>
          <p className="mono" style={{ fontSize: 11.5 }}>
            {r.methode.formule}
          </p>
          <p className="discret">
            {r.methode.reference}. {r.methode.nature} F_C = {nombre(r.methode.f_c_defaut, 2)} (valeur prudente, en attendant l'analyse de
            laboratoire). F_perm selon la température de carbonisation mesurée à chaque cuisson.
          </p>
          <p className="discret" style={{ marginTop: 22, fontSize: 10.5 }}>
            Document généré par la plateforme KaboChar. Chaque lot cité dispose d'un passeport vérifiable (empreinte SHA-256).
          </p>
        </article>
      )}
    </div>
  )
}

function Indicateur({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="indicateur">
      <span className="discret" style={{ fontSize: 11 }}>
        {libelle}
      </span>
      <b>{valeur}</b>
    </div>
  )
}

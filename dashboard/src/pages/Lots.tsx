import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { EnTetePage, Panneau, PuceEtape, Vide } from '@/components/base'
import { useApi } from '@/lib/donnees'
import { dateCourte, masseTexte, nombre, pourcent } from '@/lib/format'
import { CLASSES, ETAPES } from '@/lib/theme'
import { STATUTS, type Lot, type Statut } from '@/lib/types'

export function Lots() {
  const navigate = useNavigate()
  const { donnees: lots = [], charge } = useApi<Lot[]>('/lots?limite=1000')
  const [etape, setEtape] = useState<Statut | null>(null)
  const [recherche, setRecherche] = useState('')

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return lots.filter(
      (l) =>
        (!etape || l.statut === etape) &&
        (!q || l.code.toLowerCase().includes(q) || (l.producteur_nom ?? '').toLowerCase().includes(q) || (l.village ?? '').toLowerCase().includes(q)),
    )
  }, [lots, etape, recherche])

  return (
    <div className={charge ? 'chargement' : ''}>
      <EnTetePage surtitre={`${lots.length} lots tracés`} titre="Lots" />
      <div className="actions" style={{ marginBottom: 16 }}>
        <input className="recherche" placeholder="Code, producteur ou village" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        <div className="segment" role="group" aria-label="Étape">
          <button type="button" aria-pressed={etape === null} onClick={() => setEtape(null)}>
            Toutes
          </button>
          {STATUTS.map((s) => (
            <button key={s} type="button" aria-pressed={etape === s} onClick={() => setEtape(s)}>
              {ETAPES[s].libelle}
            </button>
          ))}
        </div>
      </div>
      <Panneau>
        {filtres.length === 0 ? (
          <Vide>Aucun lot ne correspond.</Vide>
        ) : (
          <table className="tableau">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Producteur</th>
                <th>Étape</th>
                <th className="nombre">Collecte</th>
                <th className="nombre">Cabosses</th>
                <th className="nombre">Biochar</th>
                <th className="nombre">Rendement</th>
                <th>Classe GIEC</th>
                <th className="nombre">CO₂ stocké</th>
              </tr>
            </thead>
            <tbody>
              {filtres.map((l) => (
                <tr key={l.id} className="cliquable" onClick={() => navigate(`/lots/${l.id}`)}>
                  <td className="mono">{l.code}</td>
                  <td>
                    {l.producteur_nom}
                    <span className="discret"> · {l.village}</span>
                  </td>
                  <td>
                    <PuceEtape statut={l.statut} />
                  </td>
                  <td className="nombre discret">{dateCourte(l.collecte_le)}</td>
                  <td className="nombre">{masseTexte(l.masse_cabosses_kg)}</td>
                  <td className="nombre">{masseTexte(l.masse_biochar_kg)}</td>
                  <td className="nombre">{pourcent(l.rendement, 1)}</td>
                  <td>{l.classe && l.classe !== 'inconnue' ? CLASSES[l.classe]?.court : <span className="discret">—</span>}</td>
                  <td className="nombre">{l.co2_kg ? `${nombre(l.co2_kg, 1)} kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panneau>
    </div>
  )
}

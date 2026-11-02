import { ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

import { BadgeDemo, EnTetePage, Panneau, Tuile } from '@/components/base'
import { useApi } from '@/lib/donnees'
import { masseTexte, nombre, pourcent } from '@/lib/format'
import type { Parcelle, Producteur } from '@/lib/types'

type Tri = 'nom' | 'biochar' | 'co2'

export function Producteurs() {
  const { donnees: producteurs = [], charge } = useApi<Producteur[]>('/producteurs', 60_000)
  const { donnees: parcelles = [] } = useApi<Parcelle[]>('/parcelles', 60_000)
  const [tri, setTri] = useState<Tri>('biochar')

  const surface = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of parcelles) m.set(p.producteur_id, (m.get(p.producteur_id) ?? 0) + (p.surface_ha ?? 0))
    return m
  }, [parcelles])
  const liste = useMemo(
    () =>
      [...producteurs].sort((a, b) =>
        tri === 'nom' ? a.nom.localeCompare(b.nom) : tri === 'biochar' ? b.biochar_kg - a.biochar_kg : b.co2_kg - a.co2_kg,
      ),
    [producteurs, tri],
  )
  const femmes = producteurs.filter((p) => p.genre === 'F').length
  const maxBiochar = Math.max(0, ...producteurs.map((p) => p.biochar_kg))
  const surfaceTotale = [...surface.values()].reduce((a, b) => a + b, 0)

  return (
    <div className={charge ? 'chargement' : ''}>
      <EnTetePage surtitre="Coopérative pilote" titre="Producteurs" actions={producteurs.some((p) => p.demo) ? <BadgeDemo /> : undefined} />
      <div className="grille" style={{ marginBottom: 16 }}>
        <Tuile className="s3" etiquette="Producteurs" valeur={String(producteurs.length)} detail={`${new Set(producteurs.map((p) => p.village)).size} villages`} />
        <div className="panneau s3">
          <div className="etiquette">Productrices</div>
          <div className="tuile-valeur">
            {femmes}
            <small>sur {producteurs.length}</small>
          </div>
          <div className="repartition" role="img" aria-label={`${femmes} femmes, ${producteurs.length - femmes} hommes`}>
            <span style={{ flex: femmes, background: '#C98F2A' }} />
            <span style={{ flex: producteurs.length - femmes, background: '#57514A' }} />
          </div>
          <div className="tuile-detail">
            <span className="cle" style={{ background: '#C98F2A', marginRight: 5 }} />
            femmes {pourcent(producteurs.length ? femmes / producteurs.length : null)}
            <span className="cle" style={{ background: '#57514A', margin: '0 5px 0 12px' }} />
            hommes
          </div>
        </div>
        <Tuile className="s3" etiquette="Parcelles suivies" valeur={String(parcelles.length)} detail="relevées au GPS" />
        <Tuile className="s3" etiquette="Surface suivie" valeur={nombre(surfaceTotale, 1)} unite="ha" />
      </div>
      <Panneau
        titre="Tous les producteurs"
        sousTitre="Chaque fiche est créée avec l'accord du producteur (loi n° 2013-450 sur les données personnelles)."
        action={
          <div className="segment" role="group" aria-label="Trier par">
            {(
              [
                ['biochar', 'Biochar'],
                ['co2', 'CO₂'],
                ['nom', 'Nom'],
              ] as [Tri, string][]
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={tri === v} onClick={() => setTri(v)}>
                {l}
              </button>
            ))}
          </div>
        }
      >
        <table className="tableau">
          <thead>
            <tr>
              <th>Producteur</th>
              <th>Village</th>
              <th>Genre</th>
              <th className="nombre">Parcelles</th>
              <th className="nombre">Surface</th>
              <th className="nombre">Lots</th>
              <th className="nombre">Biochar</th>
              <th className="nombre">CO₂ stocké</th>
              <th>Accord</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.nom}</div>
                  <div className="mono discret" style={{ fontSize: 12 }}>
                    {p.code}
                  </div>
                </td>
                <td>{p.village}</td>
                <td className="muet">{p.genre === 'F' ? 'Femme' : p.genre === 'M' ? 'Homme' : '—'}</td>
                <td className="nombre">{p.nb_parcelles}</td>
                <td className="nombre">{nombre(surface.get(p.id) ?? 0, 1)} ha</td>
                <td className="nombre">{p.nb_lots}</td>
                <td className="nombre">
                  <div className="cellule-barre">
                    <span className="cellule-piste">
                      <span style={{ width: `${maxBiochar ? (p.biochar_kg / maxBiochar) * 100 : 0}%` }} />
                    </span>
                    {masseTexte(p.biochar_kg)}
                  </div>
                </td>
                <td className="nombre">{nombre(p.co2_kg, 1)} kg</td>
                <td>{p.consentement ? <ShieldCheck size={16} color="#8CC3A0" aria-label="Accord recueilli" /> : <span className="discret">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panneau>
    </div>
  )
}

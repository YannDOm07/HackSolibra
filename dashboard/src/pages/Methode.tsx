import { ExternalLink } from 'lucide-react'

import { EnTetePage, Panneau } from '@/components/base'
import { useApi } from '@/lib/donnees'
import { nombre } from '@/lib/format'
import { CLASSES } from '@/lib/theme'
import type { Meta } from '@/lib/types'

export function Methode() {
  const { donnees: meta } = useApi<Meta>('/meta', 0)
  if (!meta) return <EnTetePage surtitre="Transparence" titre="Méthode et sources" />

  return (
    <div>
      <EnTetePage surtitre="Transparence" titre="Méthode et sources" />
      <div className="grille">
        <Panneau className="s7" titre="Calcul du carbone stocké" sousTitre={meta.methode.reference}>
          <div className="formule" style={{ fontSize: 15 }}>
            {meta.methode.formule}
          </div>
          <p className="muet">{meta.methode.nature}</p>
          <table className="tableau" style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Température de carbonisation mesurée</th>
                <th className="nombre">F_perm (part restant après 100 ans)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(meta.methode.table_f_perm).map(([classe, v]) => (
                <tr key={classe}>
                  <td>{CLASSES[classe]?.libelle ?? classe}</td>
                  <td className="nombre mono">{nombre(v, 2)}</td>
                </tr>
              ))}
              <tr>
                <td>{CLASSES.insuffisante.libelle}</td>
                <td className="nombre mono">non comptée</td>
              </tr>
            </tbody>
          </table>
          <p className="muet" style={{ marginBottom: 0 }}>
            <b style={{ color: '#F5EFE6' }}>F_C = {nombre(meta.methode.f_c_defaut, 2)}.</b> {meta.methode.f_c_justification}
          </p>
        </Panneau>

        <Panneau className="s5" titre="Ce qui est mesuré, simulé ou fictif">
          <div style={{ display: 'grid', gap: 14, fontSize: 13.5 }}>
            <div>
              <span className="badge capteur">Capteur</span>
              <p className="muet" style={{ margin: '6px 0 0' }}>
                Températures lues par le thermocouple (ESP32 + MAX31855) monté sur le four. Elles fixent la classe de permanence de chaque cuisson.
              </p>
            </div>
            <div>
              <span className="badge sim">Simulation</span>
              <p className="muet" style={{ margin: '6px 0 0' }}>
                Courbes produites par le simulateur pour les démonstrations, calé sur les températures publiées des fours à rideau de flamme.
              </p>
            </div>
            <div>
              <span className="badge">Démo</span>
              <p className="muet" style={{ margin: '6px 0 0' }}>
                Producteurs, parcelles et lots fictifs (villages réels). Le pilote les remplacera par des données de terrain.
              </p>
            </div>
          </div>
        </Panneau>

        <Panneau className="s12" titre="Valeurs publiées utilisées" sousTitre="Chaque valeur affichée par la plateforme renvoie à sa source.">
          <table className="tableau">
            <thead>
              <tr>
                <th>Valeur</th>
                <th>Source</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {meta.references.map((r) => (
                <tr key={r.cle}>
                  <td style={{ fontWeight: 500 }}>{r.valeur}</td>
                  <td className="muet">{r.source}</td>
                  <td>
                    <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir la source : ${r.source}`}>
                      <ExternalLink size={15} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panneau>
      </div>
    </div>
  )
}

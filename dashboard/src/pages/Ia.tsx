import { CircleCheck, ShieldAlert, TriangleAlert } from 'lucide-react'

import { EnTetePage, LigneInfo, Panneau, Tuile, Vide } from '@/components/base'
import { mediaUrl } from '@/lib/api'
import { useApi } from '@/lib/donnees'
import { dateHeure, nombre, pourcent } from '@/lib/format'
import type { ClasseCabosse, DiagnosticIA, FicheModele } from '@/lib/types'

// États (bon / alerte / grave), toujours avec icône et libellé.
const COURT: Record<ClasseCabosse, string> = { healthy: 'Saine', black_pod_rot: 'Pourriture', pod_borer: 'Foreur' }

const ETATS: Record<ClasseCabosse, { couleur: string; icone: typeof CircleCheck }> = {
  healthy: { couleur: '#8CC3A0', icone: CircleCheck },
  pod_borer: { couleur: '#FFB37A', icone: TriangleAlert },
  black_pod_rot: { couleur: '#E8735E', icone: ShieldAlert },
}

export function Ia() {
  const { donnees: fiche } = useApi<FicheModele>('/ia/modele', 0)
  const { donnees: diagnostics = [] } = useApi<DiagnosticIA[]>('/diagnostics?limite=24', 20_000)

  if (!fiche) return <EnTetePage surtitre="Intelligence artificielle" titre="Diagnostics des cabosses" />
  if (!fiche.disponible || !fiche.test || !fiche.classes || !fiche.libelles) {
    return (
      <div>
        <EnTetePage surtitre="Intelligence artificielle" titre="Diagnostics des cabosses" />
        <Vide>Modèle non installé : lancer « python entrainer.py » dans le dossier ia/.</Vide>
      </div>
    )
  }
  const { test, classes, libelles } = fiche
  const sansDoublons = fiche.quasi_doublons?.test_sans_quasi_doublons

  return (
    <div>
      <EnTetePage surtitre={`Intelligence artificielle · modèle ${fiche.version}`} titre="Diagnostics des cabosses" />

      <div className="grille" style={{ marginBottom: 16 }}>
        <Tuile className="s3" etiquette="Exactitude (test)" valeur={pourcent(test.exactitude, 1)} detail={`${test.n} photos jamais vues à l'entraînement`} />
        <Tuile className="s3" etiquette="Exactitude équilibrée" valeur={pourcent(test.exactitude_equilibree, 1)} detail="moyenne des rappels : chaque maladie pèse autant" />
        <Tuile className="s3" etiquette="F1 macro" valeur={pourcent(test.f1_macro, 1)} detail="précision et rappel, toutes classes" />
        <Tuile
          className="s3"
          etiquette="Diagnostics jugés sûrs"
          valeur={pourcent(test.part_jugee_sure)}
          detail={`confiance ≥ ${pourcent(fiche.seuil_incertitude ?? 0.6)} · exactitude ${pourcent(test.exactitude_si_sure, 1)}`}
        />
      </div>

      <div className="grille">
        <Panneau className="s7" titre="Scores par classe" sousTitre="Jeu de test : 15 % des photos, mis de côté avant l'entraînement">
          <table className="tableau">
            <thead>
              <tr>
                <th>Classe</th>
                <th className="nombre">Photos</th>
                <th className="nombre">Précision</th>
                <th className="nombre">Rappel</th>
                <th className="nombre">F1</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                const v = test.par_classe[c]
                return (
                  <tr key={c}>
                    <td>{libelles[c]}</td>
                    <td className="nombre">{v.effectif}</td>
                    <td className="nombre">{pourcent(v.precision, 1)}</td>
                    <td className="nombre">{pourcent(v.rappel, 1)}</td>
                    <td className="nombre">{pourcent(v.f1, 1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="muet" style={{ fontSize: 13, marginBottom: 0 }}>
            Précision : quand le modèle annonce cette classe, il a raison dans ce pourcentage de cas. Rappel : part des cabosses de cette classe qu'il
            retrouve.
          </p>
        </Panneau>

        <Panneau className="s5" titre="Matrice de confusion" sousTitre="Lignes : vraie classe · colonnes : classe prédite">
          <table className="tableau">
            <thead>
              <tr>
                <th />
                {classes.map((c) => (
                  <th key={c} className="nombre">
                    {COURT[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {test.matrice_confusion.map((ligne, i) => (
                <tr key={classes[i]}>
                  <td className="muet">{libelles[classes[i]]}</td>
                  {ligne.map((n, j) => (
                    <td key={j} className="nombre" style={{ fontWeight: i === j ? 600 : 400, color: i !== j && n > 0 ? '#FFB37A' : undefined }}>
                      {n}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {fiche.quasi_doublons && (
            <p className="muet" style={{ fontSize: 13, marginBottom: 0 }}>
              {fiche.quasi_doublons.photos_test_concernees} photo(s) du test ressemblent presque exactement à une photo d'entraînement (similarité ≥{' '}
              {nombre(fiche.quasi_doublons.seuil_similarite_cosinus, 2)}).
              {sansDoublons && ` Sans elles : exactitude ${pourcent(sansDoublons.exactitude, 1)}, F1 macro ${pourcent(sansDoublons.f1_macro, 1)}.`}
            </p>
          )}
        </Panneau>

        <Panneau className="s7" titre="Comment le modèle a été construit">
          <LigneInfo etiquette="Méthode">{fiche.methode}</LigneInfo>
          <LigneInfo etiquette="Extracteur de caractéristiques">{fiche.extracteur}</LigneInfo>
          <LigneInfo etiquette="Données">
            <a href={fiche.jeu_de_donnees?.source} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
              {fiche.jeu_de_donnees?.nom}
            </a>{' '}
            · {fiche.jeu_de_donnees?.auteur} · {fiche.jeu_de_donnees?.licence}
          </LigneInfo>
          <LigneInfo etiquette="Photos par classe">
            {classes.map((c) => `${libelles[c]} ${fiche.jeu_de_donnees?.effectifs[c]}`).join(' · ')}
          </LigneInfo>
          <LigneInfo etiquette="Découpage (graine fixe)">
            {fiche.decoupage?.entrainement} entraînement · {fiche.decoupage?.validation} validation · {fiche.decoupage?.test} test
          </LigneInfo>
          <LigneInfo etiquette="Augmentation">{fiche.augmentation}</LigneInfo>
        </Panneau>

        <Panneau className="s5" titre="Limites, dites franchement">
          <ul className="muet" style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, display: 'grid', gap: 8 }}>
            <li>Photos prises à {fiche.jeu_de_donnees?.origine} : les variétés, la lumière et le cadrage diffèrent en Côte d'Ivoire.</li>
            <li>La classe « foreur » ne compte que {fiche.jeu_de_donnees?.effectifs.pod_borer} photos : son score est le moins fiable.</li>
            <li>Le modèle n'a jamais vu le swollen shoot ni d'autres maladies : il ne peut pas les reconnaître.</li>
            <li>Pendant le pilote, les photos des agents serviront à le réentraîner sur des cabosses ivoiriennes.</li>
          </ul>
        </Panneau>

        <Panneau className="s12" titre="Derniers diagnostics" sousTitre="Photos envoyées depuis l'application mobile">
          {diagnostics.length === 0 ? (
            <Vide>Aucun diagnostic pour l'instant : depuis l'application, Accueil → « Diagnostic d'une cabosse ».</Vide>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {diagnostics.map((d) => {
                const etat = ETATS[d.etiquette]
                return (
                  <figure key={d.id} style={{ margin: 0, background: '#1D1B18', border: '1px solid #2E2A25', borderRadius: 14, overflow: 'hidden' }}>
                    {d.photo_url && <img src={mediaUrl(d.photo_url)} alt="" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />}
                    <figcaption style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <etat.icone size={15} color={etat.couleur} />
                        {libelles[d.etiquette]}
                      </div>
                      <div className="discret" style={{ fontSize: 12 }}>
                        {pourcent(d.confiance)} · {dateHeure(d.cree_le)}
                      </div>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          )}
        </Panneau>
      </div>
    </div>
  )
}

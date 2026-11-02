import type { ReactNode } from 'react'

import { ETAPES } from '@/lib/theme'
import type { Statut } from '@/lib/types'

export function EnTetePage({ surtitre, titre, actions }: { surtitre: string; titre: string; actions?: ReactNode }) {
  return (
    <header className="entete-page">
      <div>
        <div className="etiquette">{surtitre}</div>
        <h1>{titre}</h1>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}

export function Panneau({
  titre,
  sousTitre,
  action,
  className = '',
  children,
}: {
  titre?: string
  sousTitre?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`panneau ${className}`}>
      {(titre || action) && (
        <div className="panneau-tete">
          <div>
            {titre && <h2>{titre}</h2>}
            {sousTitre && <p>{sousTitre}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Tuile({ etiquette, valeur, unite, detail, className = '' }: { etiquette: string; valeur: string; unite?: string; detail?: ReactNode; className?: string }) {
  return (
    <div className={`panneau ${className}`}>
      <div className="etiquette">{etiquette}</div>
      <div className="tuile-valeur">
        {valeur}
        {unite && <small>{unite}</small>}
      </div>
      {detail && <div className="tuile-detail">{detail}</div>}
    </div>
  )
}

export const BadgeDemo = () => <span className="badge">Démo</span>
export const BadgeSource = ({ source }: { source: string | null | undefined }) =>
  source === 'simulation' ? <span className="badge sim">Simulation</span> : source === 'capteur' ? <span className="badge capteur">Capteur</span> : null

export function PuceEtape({ statut }: { statut: Statut }) {
  return (
    <span className="puce">
      <span className="point" style={{ background: ETAPES[statut].couleur }} />
      {ETAPES[statut].libelle}
    </span>
  )
}

export function Vide({ children }: { children: ReactNode }) {
  return <div className="vide">{children}</div>
}

export function LigneInfo({ etiquette, children }: { etiquette: string; children: ReactNode }) {
  return (
    <div className="ligne-info">
      <span className="muet">{etiquette}</span>
      <span>{children}</span>
    </div>
  )
}

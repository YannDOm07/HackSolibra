import { BookOpen, FileText, Flame, LayoutDashboard, Microscope, Package, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

import { useApi } from '@/lib/donnees'
import { useDirect } from '@/lib/direct'
import type { Meta } from '@/lib/types'

const NAVIGATION = [
  { vers: '/', libelle: "Vue d'ensemble", icone: LayoutDashboard },
  { vers: '/fours', libelle: 'Fours en direct', icone: Flame },
  { vers: '/lots', libelle: 'Lots', icone: Package },
  { vers: '/producteurs', libelle: 'Producteurs', icone: Users },
  { vers: '/ia', libelle: 'Diagnostics IA', icone: Microscope },
  { vers: '/rapport', libelle: 'Rapport trimestriel', icone: FileText },
  { vers: '/methode', libelle: 'Méthode et sources', icone: BookOpen },
]

export function Coque() {
  const { connecte, fours } = useDirect()
  const { donnees: meta, erreur } = useApi<Meta>('/meta', 15_000)
  const enCuisson = Object.keys(fours).length

  return (
    <div className="coque">
      <aside className="lateral">
        <div className="marque">
          <div className="marque-logo">
            <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden>
              <circle cx="32" cy="32" r="22" fill="none" stroke="#F2652A" strokeWidth="9" />
              <circle cx="32" cy="32" r="8" fill="#FFB37A" />
            </svg>
          </div>
          <div>
            <div className="marque-nom">KaboChar</div>
            <div className="etiquette" style={{ fontSize: 9.5 }}>
              Salle de contrôle
            </div>
          </div>
        </div>
        <nav style={{ display: 'grid', gap: 2 }}>
          {NAVIGATION.map(({ vers, libelle, icone: Icone }) => (
            <NavLink key={vers} to={vers} end={vers === '/'} className="lien-nav">
              <Icone size={18} strokeWidth={2} />
              {libelle}
              {vers === '/fours' && enCuisson > 0 && (
                <span className="compteur point vivant" style={{ background: '#F2652A', color: '#F2652A' }} aria-label={`${enCuisson} en cuisson`} />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="lateral-pied">
          <span className="etat">
            <span className="point" style={{ background: erreur ? '#C8402B' : '#3D8C5F' }} />
            {erreur ? 'Serveur injoignable' : `Serveur ${meta ? `v${meta.version}` : '…'}`}
          </span>
          <span className="etat">
            <span className={`point ${connecte ? 'vivant' : ''}`} style={{ background: connecte ? '#3D8C5F' : '#57514A', color: '#3D8C5F' }} />
            {connecte ? 'Flux en direct actif' : 'Flux en direct coupé'}
          </span>
          {meta?.donnees_demo && (
            <span className="discret" style={{ lineHeight: 1.45 }}>
              <span className="badge" style={{ marginRight: 6 }}>
                Démo
              </span>
              Producteurs, parcelles et lots fictifs.
            </span>
          )}
        </div>
      </aside>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}

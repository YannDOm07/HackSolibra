import { useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { EnTetePage } from '@/components/base'
import { CarteTerrain } from '@/components/carte'
import { useDirect } from '@/lib/direct'
import { useApi } from '@/lib/donnees'
import type { Four, Lot, Parcelle, Producteur } from '@/lib/types'

export function Carte() {
  const direct = useDirect()
  const [params] = useSearchParams()
  const { donnees: lots = [] } = useApi<Lot[]>('/lots?limite=1000')
  const { donnees: fours } = useApi<Four[]>('/fours')
  const { donnees: parcelles } = useApi<Parcelle[]>('/parcelles', 60_000)
  const { donnees: producteurs = [] } = useApi<Producteur[]>('/producteurs', 60_000)
  const parId = useMemo(() => Object.fromEntries(producteurs.map((p) => [p.id, p])), [producteurs])
  const four = params.get('four')
  const parcelle = params.get('parcelle')

  return (
    <div>
      <EnTetePage surtitre="Agnéby-Tiassa · parcelles relevées au GPS" titre="Carte du terrain" />
      {fours && parcelles && (
        <CarteTerrain
          parcelles={parcelles}
          fours={fours}
          lots={lots}
          producteurs={parId}
          direct={direct.fours}
          hauteur="calc(100vh - 190px)"
          pleinePage
          selectionInitiale={four ? { type: 'four', id: four } : parcelle ? { type: 'parcelle', id: parcelle } : null}
        />
      )}
    </div>
  )
}

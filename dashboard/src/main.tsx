import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/700.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'

import { Coque } from '@/components/Coque'
import { FournisseurDirect } from '@/lib/direct'
import { Apercu } from '@/pages/Apercu'
import { Carte } from '@/pages/Carte'
import { Fours } from '@/pages/Fours'
import { Ia } from '@/pages/Ia'
import { Lot } from '@/pages/Lot'
import { Lots } from '@/pages/Lots'
import { Methode } from '@/pages/Methode'
import { Producteurs } from '@/pages/Producteurs'
import { Rapport } from '@/pages/Rapport'

createRoot(document.getElementById('racine')!).render(
  <StrictMode>
    <FournisseurDirect>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route element={<Coque />}>
            <Route index element={<Apercu />} />
            <Route path="fours" element={<Fours />} />
            <Route path="carte" element={<Carte />} />
            <Route path="lots" element={<Lots />} />
            <Route path="lots/:id" element={<Lot />} />
            <Route path="producteurs" element={<Producteurs />} />
            <Route path="ia" element={<Ia />} />
            <Route path="rapport" element={<Rapport />} />
            <Route path="methode" element={<Methode />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FournisseurDirect>
  </StrictMode>,
)

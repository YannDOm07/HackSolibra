// Formats français, indépendants de la locale du navigateur.
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const ESPACE = ' '

export function nombre(n: number | null | undefined, decimales = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  const [entier, dec] = Math.abs(n).toFixed(decimales).split('.')
  return `${n < 0 ? '−' : ''}${entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE)}${dec ? `,${dec}` : ''}`
}

export function masse(kg: number | null | undefined): { valeur: string; unite: string } {
  if (kg == null) return { valeur: '—', unite: '' }
  if (kg >= 1000) return { valeur: nombre(kg / 1000, kg >= 10000 ? 1 : 2), unite: 't' }
  return { valeur: nombre(kg, kg < 100 ? 1 : 0), unite: 'kg' }
}

export const masseTexte = (kg: number | null | undefined) => {
  const m = masse(kg)
  return m.unite ? `${m.valeur}${ESPACE}${m.unite}` : m.valeur
}

export const temperature = (c: number | null | undefined) => (c == null ? '—' : `${nombre(c)}${ESPACE}°C`)
export const pourcent = (x: number | null | undefined, decimales = 0) => (x == null ? '—' : `${nombre(x * 100, decimales)}${ESPACE}%`)

export function dateCourte(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MOIS[d.getMonth()]}`
}

export function dateLongue(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

export function dateHeure(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MOIS[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')} h ${String(d.getMinutes()).padStart(2, '0')}`
}

export function ilYa(iso: string | number | null | undefined): string {
  if (!iso) return 'jamais'
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 45) return "à l'instant"
  const m = Math.round(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`
}

export function duree(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

export function chrono(secondes: number): string {
  const h = Math.floor(secondes / 3600)
  const m = String(Math.floor((secondes % 3600) / 60)).padStart(2, '0')
  const s = String(Math.floor(secondes % 60)).padStart(2, '0')
  return h ? `${h}:${m}:${s}` : `${m}:${s}`
}

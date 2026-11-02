// Formats français, écrits à la main pour ne dépendre d'aucune donnée de locale du téléphone.
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const ESPACE = ' '; // espace fine insécable, séparateur de milliers

export function nombre(n: number | null | undefined, decimales = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  const [entier, dec] = Math.abs(n).toFixed(decimales).split('.');
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE);
  return `${n < 0 ? '−' : ''}${groupes}${dec ? `,${dec}` : ''}`;
}

/** Masse lisible : kg sous la tonne, t au-delà. */
export function masse(kg: number | null | undefined): { valeur: string; unite: string } {
  if (kg == null) return { valeur: '—', unite: 'kg' };
  if (kg >= 1000) return { valeur: nombre(kg / 1000, kg >= 10000 ? 1 : 2), unite: 't' };
  return { valeur: nombre(kg, kg < 100 ? 1 : 0), unite: 'kg' };
}

export const masseTexte = (kg: number | null | undefined) => {
  const m = masse(kg);
  return `${m.valeur}${ESPACE}${m.unite}`;
};

export const temperature = (c: number | null | undefined) => (c == null ? '—' : `${nombre(c)}${ESPACE}°C`);

export function dateCourte(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function dateHeure(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MOIS[d.getMonth()]} · ${hh} h ${mm}`;
}

export function ilYa(ms: number | null | undefined): string {
  if (!ms) return 'jamais';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
}

export function duree(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

export function chrono(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  const s = Math.floor(secondes % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/);
  return ((mots[0]?.[0] ?? '') + (mots[1]?.[0] ?? '')).toUpperCase();
}

export const parseDecimal = (texte: string): number | null => {
  const n = Number.parseFloat(texte.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
};

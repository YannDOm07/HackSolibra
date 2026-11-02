// Version web (aperçu navigateur). Sur téléphone, Metro charge stockage.native.ts (SQLite).
export const stockage = {
  async lire(cle: string): Promise<string | null> {
    return globalThis.localStorage?.getItem(cle) ?? null;
  },
  async ecrire(cle: string, valeur: string): Promise<void> {
    globalThis.localStorage?.setItem(cle, valeur);
  },
  async effacer(cle: string): Promise<void> {
    globalThis.localStorage?.removeItem(cle);
  },
};

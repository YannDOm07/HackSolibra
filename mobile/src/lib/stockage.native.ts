// Données locales du téléphone : base SQLite embarquée, disponible sans réseau.
import Storage from 'expo-sqlite/kv-store';

export const stockage = {
  lire: (cle: string) => Storage.getItemAsync(cle),
  ecrire: (cle: string, valeur: string) => Storage.setItemAsync(cle, valeur),
  async effacer(cle: string) {
    await Storage.removeItemAsync(cle);
  },
};

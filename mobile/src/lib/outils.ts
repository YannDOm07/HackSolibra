import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Même alphabet que le serveur : pas de 0/O ni 1/I, les codes sont recopiés à la main.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const nouvelId = () => Crypto.randomUUID();

/** Code lisible généré hors ligne, ex. KC-26-7QXM. */
export function codeLocal(prefixe: 'KC' | 'PR'): string {
  const aa = String(new Date().getFullYear() % 100).padStart(2, '0');
  let suffixe = '';
  for (let i = 0; i < 4; i++) suffixe += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefixe}-${aa}-${suffixe}`;
}

export const maintenant = () => new Date().toISOString();

export const CODE_LOT = /KC-\d{2}-[A-Z0-9]{4}/;

const sur = (f: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  f().catch(() => {});
};

export const vibre = {
  leger: () => sur(() => Haptics.selectionAsync()),
  impact: () => sur(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  succes: () => sur(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  erreur: () => sur(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { C, F } from '@/lib/theme';

const Y_MAX = 800;
const MARGE = { gauche: 34, droite: 8, haut: 10, bas: 22 };

/** Courbe de température d'une cuisson. La couleur du tracé suit la température, comme la braise. */
export function CourbeTemperature({
  points,
  hauteur = 210,
  sombre,
  enDirect,
  dureeMin = 30,
}: {
  points: [number, number][]; // (minutes, °C)
  hauteur?: number;
  sombre?: boolean;
  enDirect?: boolean;
  dureeMin?: number;
}) {
  const [largeur, setLargeur] = useState(0);
  const dernier = points[points.length - 1];
  const tMax = Math.max(dureeMin, dernier ? dernier[0] * 1.08 : 0);
  const zoneL = largeur - MARGE.gauche - MARGE.droite;
  const zoneH = hauteur - MARGE.haut - MARGE.bas;
  const x = (t: number) => MARGE.gauche + (t / tMax) * zoneL;
  const y = (v: number) => MARGE.haut + (1 - Math.min(Math.max(v, 0), Y_MAX) / Y_MAX) * zoneH;

  const { trace, aire } = useMemo(() => {
    if (!largeur || points.length < 2) return { trace: '', aire: '' };
    const pas = Math.max(1, Math.floor(points.length / 400));
    const pts = points.filter((_, i) => i % pas === 0 || i === points.length - 1);
    const trace = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const base = y(0).toFixed(1);
    return { trace, aire: `${trace} L${x(pts[pts.length - 1][0]).toFixed(1)},${base} L${x(pts[0][0]).toFixed(1)},${base} Z` };
    // x et y ne dépendent que de largeur, hauteur et tMax
  }, [points, largeur, hauteur, tMax]);

  const grille = sombre ? C.charbon700 : C.papier200;
  const legende = sombre ? C.charbon400 : C.charbon400;

  return (
    <View onLayout={(e) => setLargeur(e.nativeEvent.layout.width)} style={{ height: hauteur }}>
      {largeur > 0 && (
        <Svg width={largeur} height={hauteur}>
          <Defs>
            <LinearGradient id="chaleur" x1="0" y1={y(Y_MAX)} x2="0" y2={y(0)} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={C.braise600} />
              <Stop offset="0.35" stopColor={C.braise500} />
              <Stop offset="0.6" stopColor={C.cabosse400} />
              <Stop offset="1" stopColor={sombre ? C.charbon500 : C.charbon300} />
            </LinearGradient>
            <LinearGradient id="aire" x1="0" y1={y(Y_MAX)} x2="0" y2={y(0)} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={C.braise500} stopOpacity={sombre ? 0.38 : 0.22} />
              <Stop offset="1" stopColor={C.braise500} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {[0, 200, 400, 600, 800].map((v) => (
            <SvgText key={v} x={MARGE.gauche - 8} y={y(v) + 3} fontSize={9} fontFamily={F.mono} fill={legende} textAnchor="end">
              {v}
            </SvgText>
          ))}
          {[0, 450, 600].map((v) => (
            <Line
              key={v}
              x1={MARGE.gauche}
              x2={largeur - MARGE.droite}
              y1={y(v)}
              y2={y(v)}
              stroke={grille}
              strokeWidth={1}
              strokeDasharray={v ? '3 5' : undefined}
            />
          ))}
          {[0, tMax / 2, tMax].map((t, i) => (
            <SvgText
              key={i}
              x={x(t)}
              y={hauteur - 6}
              fontSize={9}
              fontFamily={F.mono}
              fill={legende}
              textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
            >
              {`${Math.round(t)} min`}
            </SvgText>
          ))}

          {aire ? <Path d={aire} fill="url(#aire)" /> : null}
          {trace ? <Path d={trace} stroke="url(#chaleur)" strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}

          {/* Libellés des seuils dessinés après la courbe, sur un fond qui les garde lisibles. */}
          {[
            { v: 450, texte: '450 °C · carbonisation' },
            { v: 600, texte: '600 °C · haute temp.' },
          ].map((s) => {
            const l = s.texte.length * 5.5 + 10;
            const xFin = largeur - MARGE.droite;
            return (
              <G key={s.v}>
                <Rect x={xFin - l} y={y(s.v) - 15} width={l} height={13} rx={4} fill={sombre ? C.charbon900 : C.blanc} opacity={0.9} />
                <SvgText x={xFin - 5} y={y(s.v) - 5.5} fontSize={9} fontFamily={F.mono} fill={legende} textAnchor="end">
                  {s.texte}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
      {enDirect && dernier && largeur > 0 && <PointVivant x={x(dernier[0])} y={y(dernier[1])} />}
    </View>
  );
}

function PointVivant({ x, y }: { x: number; y: number }) {
  const halo = useSharedValue(0);
  useEffect(() => {
    halo.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1, false);
  }, [halo]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - halo.value), transform: [{ scale: 1 + halo.value * 2.4 }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10 }}>
      <Animated.View style={[{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: C.braise500 }, style]} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.braise400, borderWidth: 2, borderColor: '#FFF3EA' }} />
    </View>
  );
}

/** Petit point qui pulse, pour signaler une activité en direct. */
export function Pulsation({ couleur = C.braise500, taille = 8 }: { couleur?: string; taille?: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false);
  }, [v]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - v.value), transform: [{ scale: 1 + v.value * 1.8 }] }));
  return (
    <View style={{ width: taille, height: taille }}>
      <Animated.View style={[{ position: 'absolute', width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleur }, halo]} />
      <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: couleur }} />
    </View>
  );
}

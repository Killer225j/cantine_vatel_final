import { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Colors } from '../../constants/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Entrée de la scène (fondu + léger zoom) — rejouée à chaque fois que le
// slide redevient actif, pas juste au montage.
const useEntrance = (active: boolean) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!active) return;
    opacity.setValue(0);
    scale.setValue(0.85);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [active]);

  return { opacity, scale };
};

// Petit badge qui apparaît avec un temps de retard (check, cadenas...).
const useBadgePop = (active: boolean, delay = 380) => {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    scale.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [active]);

  return scale;
};

// Anneau qui se remplit une fois (confirmation de paiement).
const useRing = (active: boolean, delay = 250, duration = 800) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    progress.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [active]);

  return progress;
};

// Rotation continue, sur un vrai transform RN (native driver) — une
// rotation pilotée via une prop SVG en JS était peu fiable sur device.
const useSpin = (active: boolean, duration = 7000) => {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    value.setValue(0);
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return value;
};

const CheckBadge = ({ scale, style }: { scale: Animated.Value; style?: ViewStyle }) => (
  <Animated.View style={[styles.badge, style, { transform: [{ scale }] }]}>
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={19} fill={Colors.success} stroke={Colors.white} strokeWidth={3} />
      <Path
        d="M12 20.5L17.5 26L28 14"
        stroke={Colors.white}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  </Animated.View>
);

const LockBadge = ({ scale, style }: { scale: Animated.Value; style?: ViewStyle }) => (
  <Animated.View style={[styles.badge, style, { transform: [{ scale }] }]}>
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={19} fill={Colors.success} stroke={Colors.white} strokeWidth={3} />
      <Path d="M14 18V14.5a6 6 0 0112 0V18" stroke={Colors.white} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Rect x={12} y={18} width={16} height={12} rx={2.5} fill={Colors.white} />
    </Svg>
  </Animated.View>
);

// Slide 1 : réservation d'un créneau — cadran d'horloge (aiguille animée), ticket incliné.
export const CreneauIllustration = ({ active }: { active: boolean }) => {
  const { opacity, scale } = useEntrance(active);
  const badgeScale = useBadgePop(active);
  const spin = useSpin(active);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const ticks = [0, 90, 180, 270].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: 108 + 46 * Math.sin(rad), y: 88 - 46 * Math.cos(rad) };
  });

  return (
    <View style={styles.box}>
      <Animated.View style={[styles.stage, { opacity, transform: [{ scale }] }]}>
        <Svg width={220} height={220} viewBox="0 0 200 200">
          {/* Ticket de calendrier, incliné, en arrière-plan */}
          <G rotation={-13} origin="58,150">
            <Rect x={34} y={128} width={50} height={40} rx={8} fill={Colors.white} stroke={Colors.primaryBorder} strokeWidth={2} />
            <Rect x={34} y={128} width={50} height={13} rx={8} fill={Colors.primaryDark} />
            <Circle cx={47} cy={152} r={2.5} fill={Colors.borderLight} />
            <Circle cx={57} cy={152} r={2.5} fill={Colors.borderLight} />
            <Circle cx={67} cy={152} r={2.5} fill={Colors.borderLight} />
          </G>

          {/* Cadran (l'aiguille des minutes est un calque RN à part, voir plus bas) */}
          <Circle cx={108} cy={88} r={56} fill={Colors.white} stroke={Colors.primaryBorder} strokeWidth={2} />
          {ticks.map((t, i) => (
            <Circle key={i} cx={t.x} cy={t.y} r={2.5} fill={Colors.borderLight} />
          ))}
          <Line x1={108} y1={88} x2={108} y2={60} stroke={Colors.primary} strokeWidth={4} strokeLinecap="round" />
          <Circle cx={108} cy={88} r={3.5} fill={Colors.primaryDark} />
        </Svg>

        {/* Aiguille des minutes : un petit calque carré centré sur le cadran,
            tourné via un vrai transform RN (fiable + fluide sur device). */}
        <Animated.View style={[styles.minuteHandWrap, { transform: [{ rotate }] }]}>
          <Svg width={56} height={56} viewBox="0 0 56 56">
            <Line x1={28} y1={28} x2={28} y2={4} stroke={Colors.primaryDark} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
      <CheckBadge scale={badgeScale} style={styles.badgeClock} />
    </View>
  );
};

// Slide 3 : recharge Mobile Money — reçu avec anneau de confirmation animé.
export const PaiementIllustration = ({ active }: { active: boolean }) => {
  const { opacity, scale } = useEntrance(active);
  const ring = useRing(active, 260, 800);
  const checkScale = useBadgePop(active, 1050);
  const calcScale = useBadgePop(active, 500);
  const operators = ['#FF6600', '#FFCC00', '#00A3E0', '#0072CE'];

  const r = 18;
  const circumference = 2 * Math.PI * r;
  const dashoffset = ring.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={styles.box}>
      <Animated.View style={[styles.stage, { opacity, transform: [{ scale }] }]}>
        <Svg width={220} height={220} viewBox="0 0 200 200">
          <Rect x={50} y={34} width={100} height={142} rx={16} fill={Colors.white} stroke={Colors.primaryBorder} strokeWidth={2} />
          <Rect x={62} y={48} width={16} height={11} rx={3} fill={Colors.primary} />

          <Circle cx={100} cy={88} r={r} fill="none" stroke={Colors.borderLight} strokeWidth={4} />
          <AnimatedCircle
            cx={100}
            cy={88}
            r={r}
            fill="none"
            stroke={Colors.primary}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${circumference},${circumference}`}
            strokeDashoffset={dashoffset}
            rotation={-90}
            origin="100,88"
          />

          <SvgText x={100} y={128} fontSize={17} fontWeight="700" fill={Colors.textPrimary} textAnchor="middle">
            5 000 FCFA
          </SvgText>
          <SvgText x={100} y={143} fontSize={10} fill={Colors.success} textAnchor="middle">
            Paiement confirmé
          </SvgText>

          {operators.map((c, i) => (
            <Circle key={c} cx={82 + i * 12} cy={157} r={3.2} fill={c} />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.badge, styles.badgeCheck, { transform: [{ scale: checkScale }] }]}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path d="M5 12.5L10 17L19 7" stroke={Colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.badge, styles.badgeCalc, { transform: [{ scale: calcScale }] }]}>
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={15} fill={Colors.primaryLight} stroke={Colors.white} strokeWidth={2} />
          {[0, 1].map((row) =>
            [0, 1, 2].map((col) => (
              <Circle key={`${row}-${col}`} cx={10 + col * 6} cy={12 + row * 6} r={1.8} fill={Colors.primary} />
            ))
          )}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: 220,
    height: 220,
  },
  badge: {
    position: 'absolute',
  },
  badgeClock: {
    right: 14,
    bottom: 44,
  },
  minuteHandWrap: {
    position: 'absolute',
    left: 91,
    top: 69,
    width: 56,
    height: 56,
  },
  badgeLock: {
    left: 130,
    top: 18,
  },
  badgeCheck: {
    left: 98,
    top: 85,
  },
  badgeCalc: {
    left: 149,
    top: 178,
  },
});

// Allergies : un bouclier qui apparaît, pour « le personnel est prévenu ».
export const AllergieIllustration = ({ active }: { active: boolean }) => {
  const { opacity, scale } = useEntrance(active);
  const badgeScale = useBadgePop(active, 300);
  return (
    <View style={styles.box}>
      <Animated.View style={[styles.stage, { opacity, transform: [{ scale }] }]}>
        <Svg width={220} height={220} viewBox="0 0 200 200">
          <Circle cx={100} cy={100} r={64} fill={Colors.primaryLight} />
          <Path
            d="M100 52 140 66v30c0 26-17 44-40 54-23-10-40-28-40-54V66Z"
            fill={Colors.white}
            stroke={Colors.primary}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <Path d="M100 80v26" stroke={Colors.error} strokeWidth={7} strokeLinecap="round" />
          <Circle cx={100} cy={120} r={4.5} fill={Colors.error} />
        </Svg>
      </Animated.View>
      <CheckBadge scale={badgeScale} style={styles.badgeClock} />
    </View>
  );
};

import { ComponentRef, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Config } from '../../src/constants/config';
import {
  CreneauIllustration,
  AllergieIllustration,
  PaiementIllustration,
} from '../../src/components/onboarding/OnboardingIllustrations';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    Illustration: CreneauIllustration,
    title: 'Réservez votre créneau',
    subtitle: 'Choisissez votre plat et l’heure de passage depuis votre téléphone. Au comptoir, un QR code suffit : plus de file.',
  },
  {
    id: 2,
    Illustration: AllergieIllustration,
    title: 'Vos allergies, prises au sérieux',
    subtitle: 'Les plats à risque sont signalés, et le personnel est alerté au moment du scan de votre réservation.',
  },
  {
    id: 3,
    Illustration: PaiementIllustration,
    title: 'Payez sans espèces',
    subtitle: 'Les parents rechargent le compte par Wave ou Orange Money et suivent les repas au quotidien.',
  },
];

export default function OnboardingScreen() {
  // Pied de page en position absolue : rien ne le tient au-dessus de la barre
  // de navigation, il porte donc lui-même l'écart.
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const handleNext = () => {
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrent(next);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(Config.ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrent(index);
  };

  const isLast = current === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish} hitSlop={10}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={[styles.slide, { width, height }]}>
            <slide.Illustration active={current === index} />

            <Text style={styles.kicker}>Cantine Vatel</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer fixe */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 56) }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === current && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {isLast ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 220,
    gap: 14,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 56,
    paddingTop: 20,
    alignItems: 'center',
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  nextBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});

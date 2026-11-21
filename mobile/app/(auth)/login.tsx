import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { accueilDuRole, useAuth } from '../../src/features/auth/useAuth';
import { LoginForm, LoginErrors } from '../../src/features/auth/auth.types';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';

const initialForm: LoginForm = {
  mode: 'email',
  email: '',
  phone: '',
  dial: '+225',
  password: '',
};

/** Comptes de démonstration : un appui et on est connecté. */
const COMPTES_DEMO = [
  { libelle: 'Élève · Yann', email: 'eleve@vatel.ci', icone: 'school-outline' as const },
  { libelle: 'Parent · Aya', email: 'parent@vatel.ci', icone: 'people-outline' as const },
  { libelle: 'Cuisine · Bolou', email: 'cuisine@vatel.ci', icone: 'restaurant-outline' as const },
];
const MOT_DE_PASSE_DEMO = 'Cantine2026!';

export default function LoginScreen() {
  const { state, login, validateLogin } = useAuth();
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [oubli, setOubli] = useState(false);
  const [demoEnCours, setDemoEnCours] = useState<string | null>(null);

  const update = (key: keyof LoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof LoginErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const newErrors = validateLogin(form);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const user = await login(form);
    if (user) router.replace(accueilDuRole(user.role) as never);
  };

  const connecterDemo = async (email: string) => {
    setDemoEnCours(email);
    setErrors({});
    setForm({ ...initialForm, email, password: MOT_DE_PASSE_DEMO });
    const user = await login({ ...initialForm, email, password: MOT_DE_PASSE_DEMO });
    setDemoEnCours(null);
    if (user) router.replace(accueilDuRole(user.role) as never);
  };

  const occupe = state.status === 'loading';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="cover" />

          <Text style={styles.title}>Bon retour !</Text>
          <Text style={styles.subtitle}>Connectez-vous pour réserver votre repas.</Text>

          {/* Email / Téléphone */}
          <View style={styles.toggle}>
            {(['email', 'phone'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setForm((p) => ({ ...p, mode }))}
                style={[styles.toggleBtn, form.mode === mode && styles.toggleActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: form.mode === mode }}
              >
                <Text style={[styles.toggleText, form.mode === mode && styles.toggleTextActive]}>
                  {mode === 'email' ? 'Email' : 'Téléphone'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.mode === 'email' ? (
            <Input
              label="Adresse email"
              placeholder="prenom.nom@vatel.ci"
              value={form.email}
              onChangeText={(v) => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
          ) : (
            <View style={styles.phoneRow}>
              <View style={styles.dialBox}>
                <Ionicons name="call-outline" size={14} color={Colors.textPrimary} />
                <Text style={styles.dialText}>+225</Text>
              </View>
              <View style={styles.phoneInput}>
                <Input
                  placeholder="07 00 00 00 00"
                  value={form.phone}
                  onChangeText={(v) => update('phone', v)}
                  keyboardType="phone-pad"
                  error={errors.phone}
                />
              </View>
            </View>
          )}

          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={form.password}
            onChangeText={(v) => update('password', v)}
            isPassword
            error={errors.password}
          />

          <TouchableOpacity onPress={() => setOubli(!oubli)} style={styles.oubli} accessibilityRole="link">
            <Text style={styles.lien}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
          {oubli && (
            <Text style={styles.aide}>
              La réinitialisation se fait auprès de l’administration de la cantine : présentez-vous au comptoir avec votre pièce.
            </Text>
          )}

          {state.error ? (
            <View style={styles.errorWrap} accessibilityRole="alert">
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          ) : null}

          <Button
            label="Se connecter"
            onPress={handleSubmit}
            loading={occupe && !demoEnCours}
            disabled={occupe}
            style={styles.btnLogin}
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.lien}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          {/* Comptes de démonstration */}
          <View style={styles.demo}>
            <Text style={styles.demoTitre}>COMPTES DE DÉMO</Text>
            <View style={styles.demoRangee}>
              {COMPTES_DEMO.map((c) => (
                <TouchableOpacity
                  key={c.email}
                  onPress={() => connecterDemo(c.email)}
                  disabled={occupe}
                  style={[styles.demoBtn, occupe && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Se connecter en tant que ${c.libelle}`}
                >
                  <Ionicons name={demoEnCours === c.email ? 'hourglass-outline' : c.icone} size={16} color={Colors.primary} />
                  <View>
                    <Text style={styles.demoTexte} numberOfLines={1}>
                      {c.libelle.split(' · ')[0]}
                    </Text>
                    <Text style={styles.demoNom} numberOfLines={1}>
                      {c.libelle.split(' · ')[1]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },

  logo: { width: 58, height: 58, borderRadius: 16, marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 22 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  toggleActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary },

  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dialBox: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 0,
  },
  dialText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  phoneInput: { flex: 1 },

  oubli: { alignSelf: 'flex-end', marginTop: -2, marginBottom: 6, paddingVertical: 6 },
  lien: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  aide: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: 8 },

  errorWrap: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  errorText: { color: Colors.error, fontSize: 13, fontWeight: '600' },

  btnLogin: { marginTop: 6, height: 54 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  registerText: { fontSize: 13, color: Colors.textSecondary },

  demo: {
    marginTop: 28,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  demoTitre: { fontSize: 11, fontWeight: '800', color: Colors.primary, letterSpacing: 0.8, marginBottom: 10 },
  demoRangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  demoBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  demoTexte: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  demoNom: { fontSize: 11, color: Colors.textSecondary },
});

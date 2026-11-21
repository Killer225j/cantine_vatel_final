import { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Colors } from '../../src/constants/colors';
import { RegisterErrors, RegisterForm } from '../../src/features/auth/auth.types';
import { accueilDuRole, useAuth } from '../../src/features/auth/useAuth';

const initialForm: RegisterForm = {
  role: 'ELEVE',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dial: '+225',
  password: '',
  acceptCgu: false,
};

const ROLES: { value: RegisterForm['role']; label: string; icon: keyof typeof Ionicons.glyphMap; detail: string }[] = [
  { value: 'ELEVE', label: 'Élève', icon: 'school-outline', detail: 'Je réserve mes repas' },
  { value: 'PARENT', label: 'Parent', icon: 'people-outline', detail: 'Je recharge et je suis' },
];

export default function RegisterScreen() {
  const { state, register, validateRegister } = useAuth();
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<RegisterErrors>({});

  const update = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof RegisterErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = async () => {
    const newErrors = validateRegister(form);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const user = await register(form);
    if (user) router.replace(accueilDuRole(user.role) as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Vous êtes…</Text>

          <View style={styles.roles}>
            {ROLES.map((r) => {
              const actif = form.role === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.role, actif && styles.roleActif]}
                  onPress={() => update('role', r.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: actif }}
                >
                  <Ionicons name={r.icon} size={22} color={actif ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.roleLabel, actif && styles.roleLabelActif]}>{r.label}</Text>
                  <Text style={styles.roleDetail}>{r.detail}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.deux}>
            <Input
              label="Prénom"
              value={form.firstName}
              onChangeText={(v) => update('firstName', v)}
              error={errors.firstName}
              autoComplete="given-name"
              containerStyle={styles.demi}
            />
            <Input
              label="Nom"
              value={form.lastName}
              onChangeText={(v) => update('lastName', v)}
              error={errors.lastName}
              autoComplete="family-name"
              containerStyle={styles.demi}
            />
          </View>

          <Input
            label="Email"
            value={form.email}
            onChangeText={(v) => update('email', v)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Téléphone (facultatif)"
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
            error={errors.phone}
            keyboardType="phone-pad"
            leftIcon={<Text style={styles.dial}>{form.dial}</Text>}
          />

          <Input
            label="Mot de passe"
            value={form.password}
            onChangeText={(v) => update('password', v)}
            error={errors.password}
            isPassword
          />
          <Text style={styles.indice}>8 caractères minimum, avec une majuscule et un chiffre.</Text>

          <TouchableOpacity
            style={styles.cgu}
            onPress={() => update('acceptCgu', !form.acceptCgu)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.acceptCgu }}
          >
            <Ionicons
              name={form.acceptCgu ? 'checkbox' : 'square-outline'}
              size={20}
              color={form.acceptCgu ? Colors.primary : Colors.textSecondary}
            />
            <Text style={styles.cguText}>J’accepte les conditions d’utilisation de la cantine</Text>
          </TouchableOpacity>
          {errors.acceptCgu && <Text style={styles.erreurChamp}>{errors.acceptCgu}</Text>}

          {state.error && (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          )}

          <Button label="Créer mon compte" onPress={handleSubmit} loading={state.status === 'loading'} />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà inscrit ? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { width: 40, height: 40, justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 14 },
  roles: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  role: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: 4,
  },
  roleActif: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  roleLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginTop: 4 },
  roleLabelActif: { color: Colors.primaryDark },
  roleDetail: { fontSize: 12, color: Colors.textSecondary },
  deux: { flexDirection: 'row', gap: 12 },
  demi: { flex: 1 },
  dial: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  indice: { fontSize: 12, color: Colors.textSecondary, marginTop: -8, marginBottom: 16 },
  cgu: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cguText: { flex: 1, fontSize: 13, color: Colors.textMuted },
  erreurChamp: { fontSize: 12, color: Colors.error, marginBottom: 8 },
  errorWrap: {
    backgroundColor: Colors.errorLight,
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  errorText: { color: Colors.error, fontSize: 13 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});

import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
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

export default function LoginScreen() {
  const { state, login, validateLogin } = useAuth();
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [errors, setErrors] = useState<LoginErrors>({});

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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Cantine Vatel</Text>
            <Text style={styles.appTagline}>Zéro file, zéro gaspi, zéro risque</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            <Text style={styles.title}>Bon retour</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>

            {/* Toggle Email / Téléphone */}
            <View style={styles.toggle}>
              <TouchableOpacity
                onPress={() => setForm((p) => ({ ...p, mode: 'email' }))}
                style={[styles.toggleBtn, form.mode === 'email' && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, form.mode === 'email' && styles.toggleTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setForm((p) => ({ ...p, mode: 'phone' }))}
                style={[styles.toggleBtn, form.mode === 'phone' && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, form.mode === 'phone' && styles.toggleTextActive]}>
                  Téléphone
                </Text>
              </TouchableOpacity>
            </View>

            {/* Champ email ou téléphone */}
            {form.mode === 'email' ? (
              <Input
                label="Adresse email"
                placeholder="prenom.nom@exemple.ci"
                value={form.email}
                onChangeText={(v) => update('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
            ) : (
              <View style={styles.phoneRow}>
                <View style={styles.dialBox}>
                  <View style={styles.dialInner}>
                    <Ionicons name="call-outline" size={14} color={Colors.textPrimary} />
                    <Text style={styles.dialText}>+225</Text>
                  </View>
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

            {/* Mot de passe */}
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              value={form.password}
              onChangeText={(v) => update('password', v)}
              isPassword
              error={errors.password}
            />

            {/* Erreur globale */}
            {state.error && (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>{state.error}</Text>
              </View>
            )}

            {/* Bouton connexion */}
            <Button
              label="Se connecter"
              onPress={handleSubmit}
              loading={state.status === 'loading'}
              style={styles.btnLogin}
            />

            {/* Lien inscription */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Pas encore de compte ? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLink}>S'inscrire</Text>
              </TouchableOpacity>
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
  scroll: { flexGrow: 1 },

  brand: {
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoMark: {
    width: 66,
    height: 59,
    marginBottom: 11,
  },
  appName: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  appTagline: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  form: { padding: 28 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
  },

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },

  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dialInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dialBox: {
    height: 52,
    backgroundColor: Colors.borderLight,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  phoneInput: { flex: 1 },

  forgotWrap: { alignItems: 'flex-end', marginBottom: 20 },
  forgot: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },

  errorWrap: {
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    textAlign: 'center',
  },

  btnLogin: { marginBottom: 16 },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },

  googleBtn: {
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  googleText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});

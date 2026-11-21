import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export type StatusModalStatus = 'loading' | 'success' | 'error';

interface StatusModalState {
  visible: boolean;
  status: StatusModalStatus;
  title: string;
  message: string;
}

const CLOSED: StatusModalState = { visible: false, status: 'loading', title: '', message: '' };

/**
 * Pilote un StatusModal : `loading` à l'envoi, puis `success` ou `error`
 * selon la réponse. Évite de redéclarer le même objet d'état dans chaque
 * écran qui enchaîne une action réseau.
 */
export const useStatusModal = () => {
  const [state, setState] = useState<StatusModalState>(CLOSED);

  return {
    state,
    loading: (title: string, message: string) =>
      setState({ visible: true, status: 'loading', title, message }),
    success: (title: string, message: string) =>
      setState({ visible: true, status: 'success', title, message }),
    error: (title: string, message: string) =>
      setState({ visible: true, status: 'error', title, message }),
    close: () => setState((s) => ({ ...s, visible: false })),
  };
};

interface Props {
  visible: boolean;
  status: StatusModalStatus;
  title: string;
  message: string;
  closeLabel?: string;
  // Sans effet tant que status === 'loading' : on ne laisse pas fermer une
  // action encore en vol (même règle que ConfirmModal).
  onClose: () => void;
}

// Modal de retour d'action asynchrone (envoi, validation...) — passe de
// 'loading' à 'success'/'error' à la place d'un Alert.alert natif ponctuel,
// pour que l'attente réseau soit visible plutôt que silencieuse.
export const StatusModal = ({
  visible,
  status,
  title,
  message,
  closeLabel = 'Fermer',
  onClose,
}: Props) => {
  const loading = status === 'loading';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={loading ? undefined : onClose}
        />

        <View style={styles.card}>
          <View
            style={[
              styles.iconWrap,
              status === 'success' && styles.iconWrapSuccess,
              status === 'error' && styles.iconWrapError,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name={status === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={28}
                color={status === 'success' ? Colors.success : Colors.error}
              />
            )}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {!loading && (
            <TouchableOpacity style={styles.btnClose} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.btnCloseText}>{closeLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapSuccess: { backgroundColor: Colors.successLight },
  iconWrapError: { backgroundColor: Colors.errorLight },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  btnClose: {
    height: 44,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
});

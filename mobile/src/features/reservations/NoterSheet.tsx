import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { cantineApi, Reservation } from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';

const ETIQUETTES = ['Bon goût', 'Servi chaud', 'Portion généreuse', 'Trop salé', 'Trop pimenté', 'Service rapide', 'Décevant'];

interface Props {
  reservation: Reservation | null;
  onClose: () => void;
  onNote: () => void;
}

/** « Comment était votre repas ? » : 1 à 5 étoiles, étiquettes rapides, commentaire facultatif. */
export function NoterSheet({ reservation, onClose, onNote }: Props) {
  const [etoiles, setEtoiles] = useState(0);
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [merci, setMerci] = useState(false);

  useEffect(() => {
    if (reservation) {
      setEtoiles(0);
      setEtiquettes([]);
      setCommentaire('');
      setErreur('');
      setMerci(false);
    }
  }, [reservation?.id]);

  const envoyer = async () => {
    if (!reservation || !etoiles) return;
    setEnvoi(true);
    setErreur('');
    try {
      await cantineApi.noter(reservation.id, etoiles, etiquettes, commentaire);
      setMerci(true);
      onNote();
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Votre avis n’a pas pu être envoyé.'));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <BottomSheetModal
      visible={!!reservation}
      onClose={onClose}
      title={merci ? 'Merci !' : 'Noter ce repas'}
      footer={
        merci ? (
          <Button label="Fermer" onPress={onClose} />
        ) : (
          <Button label="Envoyer mon avis" loading={envoi} disabled={!etoiles} onPress={envoyer} />
        )
      }
    >
      {merci ? (
        <View style={styles.merci}>
          <View style={styles.rond}>
            <Ionicons name="heart" size={34} color={Colors.white} />
          </View>
          <Text style={styles.merciTitre}>Merci pour votre avis</Text>
          <Text style={styles.sous}>Il aide la cuisine à améliorer les plats.</Text>
        </View>
      ) : (
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <Text style={styles.question}>Comment était votre {reservation?.plat.nom.toLowerCase()} ?</Text>
          <View style={styles.etoiles} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setEtoiles(n)} accessibilityRole="radio" accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`} accessibilityState={{ selected: etoiles === n }}>
                <Ionicons name={n <= etoiles ? 'star' : 'star-outline'} size={38} color={n <= etoiles ? '#f59e0b' : Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.puces}>
            {ETIQUETTES.map((e) => {
              const actif = etiquettes.includes(e);
              return (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEtiquettes(actif ? etiquettes.filter((x) => x !== e) : [...etiquettes, e])}
                  style={[styles.puce, actif && styles.puceActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                >
                  <Text style={[styles.puceTexte, actif && { color: Colors.white }]}>{e}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            value={commentaire}
            onChangeText={setCommentaire}
            placeholder="Un commentaire ? (facultatif)"
            placeholderTextColor={Colors.textTertiary}
            multiline
            maxLength={300}
            style={styles.champ}
          />
          {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        </View>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  etoiles: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  puce: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  puceActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  puceTexte: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  champ: { minHeight: 74, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 14, color: Colors.textPrimary, textAlignVertical: 'top' },
  erreur: { color: Colors.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  merci: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  rond: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  merciTitre: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sous: { fontSize: 13, color: Colors.textSecondary },
});

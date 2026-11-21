import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { Button } from '../../components/ui/Button';
import { PhotoPlat } from '../../components/ui/PhotoPlat';
import { Colors } from '../../constants/colors';
import {
  aujourdhui,
  cantineApi,
  Creneau,
  fcfa,
  heure,
  ItemMenu,
  Portefeuille,
} from '../../api/cantine.api';
import { getApiErrorMessage } from '../../utils/apiError';

type Etape = 'detail' | 'creneau' | 'confirmer' | 'succes';

interface Props {
  item: ItemMenu | null;
  date: string;
  portefeuille: Portefeuille | null;
  onClose: () => void;
  /** Appelé après une réservation réussie (pour rafraîchir le solde). */
  onReserve: () => void;
  /** Ouvre la fenêtre de recharge du solde. */
  onRecharger: () => void;
}

const TITRES: Record<Etape, string> = {
  detail: 'Détail du plat',
  creneau: 'Choisir un créneau',
  confirmer: 'Confirmer et payer',
  succes: 'Réservation confirmée',
};

/** Détail du plat → créneau → confirmation et paiement → succès. */
export function ReserverSheet({ item, date, portefeuille, onClose, onReserve, onRecharger }: Props) {
  const [etape, setEtape] = useState<Etape>('detail');
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [creneauId, setCreneauId] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [soldeApres, setSoldeApres] = useState<number | null>(null);
  const [demande, setDemande] = useState<{ etat: 'repos' | 'envoi' | 'ok' | 'erreur'; message: string }>({ etat: 'repos', message: '' });

  // Une nouvelle ouverture repart de zéro.
  useEffect(() => {
    if (item) {
      setEtape('detail');
      setCreneaux(null);
      setCreneauId(null);
      setErreur('');
      setSoldeApres(null);
      setDemande({ etat: 'repos', message: '' });
    }
  }, [item?.id]);

  if (!item) return <BottomSheetModal visible={false} onClose={onClose} title="" children={null} />;

  const enOffre = !!item.prixAntiGaspi && !!item.antiGaspiJusqua && new Date(item.antiGaspiJusqua) > new Date();
  const prix = enOffre ? (item.prixAntiGaspi as number) : item.plat.prix;
  const passe = date < aujourdhui();
  const creneau = creneaux?.find((c) => c.id === creneauId) ?? null;
  const solde = portefeuille?.solde ?? 0;
  const apres = solde - prix;

  const chargerCreneaux = async () => {
    setErreur('');
    setEtape('creneau');
    try {
      setCreneaux(await cantineApi.creneaux(date));
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'Impossible de charger les créneaux.'));
    }
  };

  const payer = async () => {
    if (!creneau) return;
    setEnvoi(true);
    setErreur('');
    try {
      await cantineApi.reserver(item.id, creneau.id, enOffre);
      setSoldeApres(apres);
      setEtape('succes');
      onReserve();
    } catch (e) {
      setErreur(getApiErrorMessage(e, 'La réservation a échoué. Réessayez.'));
    } finally {
      setEnvoi(false);
    }
  };

  const demanderAUnParent = async () => {
    setDemande({ etat: 'envoi', message: '' });
    try {
      await cantineApi.demanderRecharge();
      setDemande({ etat: 'ok', message: 'Demande envoyée : votre parent a reçu une notification.' });
    } catch (e) {
      setDemande({ etat: 'erreur', message: getApiErrorMessage(e, 'La demande n’a pas pu être envoyée.') });
    }
  };

  const pied = (() => {
    switch (etape) {
      case 'detail':
        return (
          <Button
            label={passe ? 'Jour passé' : item.incompatible ? 'Réserver malgré l’alerte' : 'Réserver'}
            variant={item.incompatible ? 'outline' : 'primary'}
            disabled={passe}
            onPress={chargerCreneaux}
          />
        );
      case 'creneau':
        return (
          <Button
            label="Continuer"
            disabled={!creneau}
            onPress={() => {
              setErreur('');
              setEtape('confirmer');
            }}
          />
        );
      case 'confirmer':
        return (
          <Button
            label={`Payer ${fcfa(prix)} et réserver`}
            loading={envoi}
            disabled={apres < 0}
            onPress={payer}
          />
        );
      case 'succes':
        return (
          <Button
            label="Voir mon QR code"
            onPress={() => {
              onClose();
              router.push('/(eleve)/(tabs)/reservations');
            }}
          />
        );
    }
  })();

  return (
    <BottomSheetModal visible onClose={onClose} title={TITRES[etape]} footer={pied}>
      {etape === 'detail' && (
        <View style={styles.bloc}>
          <PhotoPlat uri={item.plat.photoUrl} nom={item.plat.nom} taille={170} largeur="100%" rayon={16} />
          <View style={styles.ligneTitre}>
            <Text style={styles.nom}>{item.plat.nom}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              {enOffre && <Text style={styles.prixBarre}>{fcfa(item.plat.prix)}</Text>}
              <Text style={styles.prix}>{fcfa(prix)}</Text>
            </View>
          </View>
          {item.plat.noteMoyenne !== null && (
            <Text style={styles.note}>
              ★ {item.plat.noteMoyenne} <Text style={styles.sousNote}>({item.plat.nbAvis} avis)</Text>
            </Text>
          )}
          {item.portionsPrevues !== null && item.portionsPrevues <= 15 && (
            <Text style={styles.urgence}>Plus que {item.portionsPrevues} portions</Text>
          )}
          {item.plat.description ? <Text style={styles.description}>{item.plat.description}</Text> : null}
          <View style={styles.pastilles}>
            {item.plat.allergenes.map((a) => (
              <Pastille key={a.code} libelle={a.nom} danger={item.conflits.some((c) => c.code === a.code)} />
            ))}
            {item.plat.vegetarien && <Pastille libelle="Végétarien" vert />}
          </View>
          {item.incompatible ? (
            <Alerte
              danger
              texte={`Contient : ${item.conflits.map((c) => c.nom.toLowerCase()).join(', ')}. Déconseillé pour vous.`}
            />
          ) : (
            <Alerte texte="Compatible avec votre profil" />
          )}
        </View>
      )}

      {etape === 'creneau' && (
        <View style={styles.bloc}>
          <Text style={styles.resume}>
            {item.plat.nom} · {fcfa(prix)}
          </Text>
          <Text style={styles.astuce}>
            Moins d’attente : 11h45 ou 12h45. Au-delà de 10 min de retard, la place est libérée.
          </Text>
          {!creneaux && !erreur && <Text style={styles.muted}>Chargement des créneaux…</Text>}
          {creneaux?.map((c) => {
            const choisi = c.id === creneauId;
            const taux = Math.min(100, Math.round((c.reserves / c.capacite) * 100));
            return (
              <TouchableOpacity
                key={c.id}
                disabled={c.complet}
                onPress={() => setCreneauId(c.id)}
                activeOpacity={0.8}
                style={[styles.creneau, choisi && styles.creneauChoisi, c.complet && styles.creneauComplet]}
                accessibilityRole="radio"
                accessibilityState={{ selected: choisi, disabled: c.complet }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.creneauHeure}>
                    {heure(c.heureDebut)} – {heure(c.heureFin)}
                  </Text>
                  <View style={styles.jauge}>
                    <View
                      style={[
                        styles.jaugeRemplie,
                        { width: `${taux}%`, backgroundColor: c.complet ? Colors.warning : Colors.primary },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.creneauPlaces, c.complet && { color: Colors.warning }]}>
                  {c.complet ? 'Complet' : c.placesRestantes <= 8 ? `Plus que ${c.placesRestantes}` : `${c.placesRestantes} places`}
                </Text>
                {choisi && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {etape === 'confirmer' && creneau && (
        <View style={styles.bloc}>
          <View style={styles.recap}>
            <Ligne l="Plat" v={item.plat.nom} />
            <Ligne l="Jour" v={new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
            <Ligne l="Créneau" v={`${heure(creneau.heureDebut)} – ${heure(creneau.heureFin)}`} />
            <Ligne l="Retrait" v="Comptoir principal" dernier />
          </View>
          <View style={styles.recap}>
            <Ligne l="Solde actuel" v={fcfa(solde)} />
            <Ligne l="Prix du repas" v={`− ${fcfa(prix)}`} />
            <Ligne l="Solde après" v={fcfa(apres)} fort dernier />
          </View>
          {apres < 0 && (
            <View style={styles.insuffisant}>
              <View style={styles.insuffisantLigne}>
                <Ionicons name="warning" size={18} color={Colors.error} />
                <Text style={styles.insuffisantTexte}>
                  Solde insuffisant :{' '}
                  <Text
                    style={styles.lien}
                    onPress={() => {
                      onClose();
                      onRecharger();
                    }}
                    accessibilityRole="link"
                  >
                    rechargez-vous
                  </Text>{' '}
                  ou{' '}
                  <Text style={styles.lien} onPress={demande.etat === 'envoi' ? undefined : demanderAUnParent} accessibilityRole="link">
                    demandez à un parent de le faire
                  </Text>
                  .
                </Text>
              </View>
              {demande.etat !== 'repos' && (
                <Text style={[styles.insuffisantRetour, demande.etat === 'erreur' && { color: Colors.error }]}>
                  {demande.etat === 'envoi' ? 'Envoi de la demande…' : demande.message}
                </Text>
              )}
            </View>
          )}
          {apres >= 0 && portefeuille && apres < portefeuille.seuilAlerte && (
            <Alerte texte={`Votre solde passera sous ${fcfa(portefeuille.seuilAlerte)} : votre parent recevra une alerte.`} attention />
          )}
          <Text style={styles.regles}>Annulation gratuite jusqu’à 10h le jour même : le repas est alors remboursé.</Text>
        </View>
      )}

      {etape === 'succes' && (
        <View style={[styles.bloc, { alignItems: 'center', paddingVertical: 16 }]}>
          <View style={styles.succes}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </View>
          <Text style={styles.succesTitre}>C’est réservé !</Text>
          <Text style={styles.resume}>
            {item.plat.nom} · {creneau ? `${heure(creneau.heureDebut)}` : ''}
          </Text>
          {soldeApres !== null && <Text style={styles.muted}>Nouveau solde : {fcfa(soldeApres)}</Text>}
        </View>
      )}

      {erreur ? <Alerte danger texte={erreur} /> : null}
    </BottomSheetModal>
  );
}

function Pastille({ libelle, danger, vert }: { libelle: string; danger?: boolean; vert?: boolean }) {
  return (
    <View style={[styles.pastille, danger && styles.pastilleDanger, vert && styles.pastilleVerte]}>
      <Text style={[styles.pastilleTexte, danger && { color: Colors.error }, vert && { color: Colors.success }]}>
        {libelle}
      </Text>
    </View>
  );
}

function Alerte({ texte, danger, attention }: { texte: string; danger?: boolean; attention?: boolean }) {
  const couleur = danger ? Colors.error : attention ? Colors.warning : Colors.success;
  const fond = danger ? Colors.errorLight : attention ? Colors.warningLight : Colors.successLight;
  const icone = danger ? 'warning' : attention ? 'alert-circle' : 'checkmark-circle';
  return (
    <View style={[styles.alerte, { backgroundColor: fond }]} accessibilityRole="alert">
      <Ionicons name={icone} size={18} color={couleur} />
      <Text style={[styles.alerteTexte, { color: couleur }]}>{texte}</Text>
    </View>
  );
}

function Ligne({ l, v, fort, dernier }: { l: string; v: string; fort?: boolean; dernier?: boolean }) {
  return (
    <View style={[styles.ligne, !dernier && styles.ligneSep]}>
      <Text style={styles.ligneL}>{l}</Text>
      <Text style={[styles.ligneV, fort && { color: Colors.primaryDark, fontWeight: '800' }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: 12, paddingBottom: 8 },
  ligneTitre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  nom: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  prix: { fontSize: 18, fontWeight: '800', color: Colors.primaryDark },
  prixBarre: { fontSize: 13, color: Colors.textTertiary, textDecorationLine: 'line-through' },
  note: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  sousNote: { color: Colors.textSecondary, fontWeight: '400' },
  urgence: { fontSize: 13, fontWeight: '700', color: Colors.warning },
  description: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pastille: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.borderLight },
  pastilleDanger: { backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.errorBorder },
  pastilleVerte: { backgroundColor: Colors.successLight },
  pastilleTexte: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  insuffisant: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: Colors.errorLight },
  insuffisantLigne: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  insuffisantTexte: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19, color: Colors.error },
  insuffisantRetour: { fontSize: 12, fontWeight: '600', color: Colors.success, paddingLeft: 26 },
  lien: { textDecorationLine: 'underline', fontWeight: '800' },
  alerte: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 12 },
  alerteTexte: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  resume: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  astuce: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  muted: { fontSize: 13, color: Colors.textSecondary },
  creneau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  creneauChoisi: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  creneauComplet: { opacity: 0.55 },
  creneauHeure: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  jauge: { height: 6, borderRadius: 3, backgroundColor: Colors.borderLight, overflow: 'hidden' },
  jaugeRemplie: { height: 6, borderRadius: 3 },
  creneauPlaces: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  recap: { backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 14 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, gap: 12 },
  ligneSep: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  ligneL: { fontSize: 14, color: Colors.textSecondary },
  ligneV: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  regles: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  succes: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  succesTitre: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
});

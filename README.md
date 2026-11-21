# Cantine Vatel

Application de gestion de la cantine de **Vatel Abidjan** — Hackathon Restauration Vatel × Epitech, 21 novembre 2026.

> **Zéro file, zéro gaspi, zéro risque.**
> L'élève réserve son repas et son créneau depuis son téléphone ; la cuisine sait combien de portions préparer ; le comptoir est alerté avant de servir un plat dangereux pour un élève allergique.

## Adresses de la démo

| | Adresse |
|---|---|
| **Back-office** (administration et cuisine) | <https://cantine-vatel-backoffice.vercel.app> |
| **API** (Swagger) | <https://cantine-vatel-api.onrender.com/api/docs> |
| **Appli mobile** (APK Android) | [Télécharger l'APK](https://expo.dev/artifacts/eas/ihyN6g2QBOTmz8xojb5D5DRNvwi4tCMKSS-hMbOufBE.apk), ou le bouton sur la page de connexion du back-office |
| **Dépôt** | <https://github.com/Killer225j/cantine_vatel_final> |

> L'API est hébergée sur l'offre gratuite de Render : elle se met en veille après 15 minutes. La première requête peut prendre une trentaine de secondes.

### Comptes de démonstration

Mot de passe commun : **`Cantine2026!`**. Sur la page de connexion, le bloc *Comptes de démo* permet de se connecter en un clic.

| Rôle | Email | Où |
|---|---|---|
| Administration — Yann ZAOU | `admin@vatel.ci` | Back-office |
| Cuisine — Bolou ZAOU | `cuisine@vatel.ci` | Back-office **et** mobile (scan au comptoir) |
| Parent — Aya Koffi | `parent@vatel.ci` | Mobile |
| Élève — Koffi Koffi (allergie arachide) | `eleve@vatel.ci` | Mobile |

## Ce que fait l'application

### 🕑 Zéro file — réserver un créneau
- L'élève voit le **menu de la semaine** et choisit **un plat et un créneau** (5 créneaux de 15 minutes, 40 couverts chacun). Les créneaux complets sont grisés, une jauge montre le remplissage.
- Il obtient un **QR code** et un code de secours `RV-XXXX-XXXX-XXXX`, disponibles hors ligne.
- Le **portefeuille** est débité à la réservation ; l'annulation est gratuite et remboursée jusqu'à 10 h le jour du repas.
- Le parent **recharge** le compte de son enfant (paiement mobile simulé : Wave, Orange Money, MTN, Moov) et reçoit une alerte quand le solde passe sous le seuil.

### 🌱 Zéro gaspi — préparer le bon nombre de portions
- **Prévision par plat** : `réservés × (1 − taux d'absence des 4 dernières semaines) + 5 % de marge`.
- **Offre de fin de service** : la cuisine lance un prix réduit (−30 / −50 / −70 %) pendant 30 à 60 minutes ; les élèves sont notifiés et réservent au prix réduit.
- Suivi des **kg sauvés**, **stocks** avec seuils d'alerte et mouvements, **rapports** exportables en CSV.

### 🛡️ Zéro risque — l'allergie arrête le service
- L'élève (ou son parent) **déclare ses allergies** ; les plats concernés sont **signalés en rouge** dans le menu.
- Au **comptoir**, le scan du QR affiche **« ALLERGIE : ARACHIDE »** et **bloque le service** tant que deux contrôles ne sont pas cochés.
- Un code déjà utilisé est refusé (**« ne pas servir »**) : pas de double service, pas de fraude.

## Les trois applications

| Dossier | Rôle | Stack | Déploiement |
|---|---|---|---|
| [`backend/`](backend) | API REST documentée (Swagger) | NestJS 10, Prisma 5, PostgreSQL | Render (`render.yaml`) |
| [`backoffice/`](backoffice) | Administration et cuisine | Angular 18, Angular Material, PrimeIcons, Tailwind | Vercel |
| [`mobile/`](mobile) | Élèves, parents et comptoir | Expo SDK 58, expo-router, React Native | APK Android via EAS |

Les trois dossiers sont indépendants (un `package.json` chacun).

### Qui fait quoi

| Rôle | Application | Fonctions |
|---|---|---|
| `ELEVE` | Mobile | Menu, réservation par créneau, QR code, solde, allergies, avis sur les repas, offres de fin de service |
| `PARENT` | Mobile | Enfants liés par code, solde et repas du jour, recharge, historique, alertes de solde bas |
| `CUISINE` | Back-office + mobile | Commandes du jour en direct, comptoir (scan caméra ou saisie), anti-gaspillage, stocks |
| `ADMIN` | Back-office | Tout ce que fait la cuisine, plus menus, catalogue des plats, comptes, rapports |

## Aperçu

| | | |
|---|---|---|
| ![Tableau de bord](captures/bo-tableau-de-bord.png) | ![Menus](captures/bo-menus.png) | ![Catalogue](captures/bo-catalogue.png) |
| Tableau de bord du jour | Menus de la semaine | Catalogue des plats |
| ![Anti-gaspillage](captures/bo-anti-gaspi.png) | ![Stocks](captures/bo-stocks.png) | ![Rapports](captures/bo-rapports.png) |
| Anti-gaspillage | Stocks | Rapports |

| Connexion | Menu | Créneaux | QR code | Alerte au comptoir | Profil |
|---|---|---|---|---|---|
| ![Connexion](captures/mobile-connexion.png) | ![Menu](captures/mobile-menu.png) | ![Créneaux](captures/mobile-creneaux.png) | ![QR](captures/mobile-qr.png) | ![Allergie](captures/mobile-comptoir-allergie.png) | ![Profil](captures/mobile-profil.png) |

## Règles métier

- **Jusqu'à 3 repas réservés par élève et par jour** (réglable avec la variable `RESERVATIONS_MAX_PAR_JOUR`), chacun avec son plat, son créneau et son QR code. Vérifié dans une transaction Serializable : deux élèves qui prennent la dernière place en même temps, l'un reçoit « créneau complet ».
- **L'API est gardée éveillée** par un appel de santé toutes les 10 minutes (GitHub Actions) et réveillée à l'ouverture des écrans de connexion.
- **Débit à la réservation**, remboursé si annulation avant 10 h (heure d'Abidjan, UTC).
- **Un code ne sert qu'une fois** ; le service d'un plat allergène exige la confirmation du contrôle (côté API, pas seulement côté écran).
- **Paiement mobile simulé** : la recharge ouvre une page de paiement fictive (Wave, Orange Money, MTN, Moov) ; aucun argent ne circule. Le crédit et le reçu `RC-…` sont réels dans la base.
- Montants en **francs CFA entiers**, dates de menu en `DATE` (pas de décalage de fuseau).

## Architecture

```
 Mobile (Expo)  ──┐
                  ├── HTTPS ──►  API NestJS (Render)  ──►  PostgreSQL (Render)
 Back-office  ────┘            JWT + rôles, Swagger
 (Angular, Vercel)
```

- **Authentification** : JWT d'accès court + jeton de rafraîchissement stocké sous forme d'**empreinte SHA-256** (rejeu impossible), rôles appliqués par un garde global (`@Roles`).
- **Réponses uniformes** : `{ success, data, meta? }` ; erreurs `{ success: false, error: { code, message, reason } }` avec une `reason` stable lue par les clients.
- **Modèle de données** : utilisateurs, liens parent-élève, allergènes, plats, menus du jour et leurs plats, créneaux, réservations, portefeuilles et transactions, avis, notifications, stocks et mouvements (migration dans `backend/prisma/migrations`).
- **Données de démonstration** : `yarn seed` crée ~200 comptes, 18 plats ivoiriens, six semaines de menus, 3 300 réservations d'historique (taux d'absence ≈ 6 %), recharges, avis et stocks. Les soldes sont égaux à la somme des transactions.

## Lancer en local

Prérequis : Node 22+, PostgreSQL, yarn (backend) et npm (back-office, mobile).

> Pas de Postgres sous la main ? Une base jetable suffit :
> `npx -y -p @electric-sql/pglite -p @electric-sql/pglite-socket pglite-server --db=./.pglite --port=5434 --max-connections=10`
> puis `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/postgres?sslmode=disable&connection_limit=1&pgbouncer=true"`.

```bash
# 1. API
cd backend
cp .env.example .env          # DATABASE_URL et deux secrets JWT
yarn install
yarn migrate:deploy && yarn seed
yarn start:dev                # http://localhost:3000/api/v1 — Swagger : /api/docs

# 2. Back-office
cd backoffice && npm install && npm start      # http://localhost:4200

# 3. Mobile
cd mobile
cp .env.example .env          # EXPO_PUBLIC_API_URL = IP du poste (ou l'API Render)
npm install && npm start      # scanner le QR avec Expo Go (SDK 58), ou « w » pour le navigateur
```

Si Expo s'arrête sur `TypeError: fetch failed`, lancer en mode hors ligne : `EXPO_OFFLINE=1 npx expo start --lan`.
Si le Wi-Fi isole les appareils, utiliser le tunnel : `npx expo start --tunnel`.

## Qualité

- `backend` : `yarn lint`, `yarn test` (94 tests : authentification, garde des rôles, prévision, filtres d'erreurs…), `yarn build`.
- `backoffice` : `npm run test:ci`, `npm run build`.
- `mobile` : `npm run typecheck`.
- Les parcours critiques (réservation, annulation et remboursement, comptoir avec allergie, recharge, stocks, comptes, rapports) ont été vérifiés par des scénarios HTTP de bout en bout sur l'API déployée.

## Déploiement

- **API + base** : Render, Blueprint `render.yaml` (racine du dépôt, dossier `backend`). Variables : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS` (adresse du back-office).
- **Back-office** : Vercel, *Root Directory* = `backoffice`. L'adresse de l'API est dans `backoffice/src/environments/environment.prod.ts`.
- **APK** : `cd mobile && npx eas-cli build -p android --profile preview`. L'adresse de l'API est dans `mobile/eas.json`.

## Limites assumées et pistes

- **Paiement simulé** : à brancher sur les API Wave / Orange Money / MTN pour la production.
- **Notifications** : enregistrées et affichées dans l'appli ; l'envoi *push* (Expo Notifications) reste à faire.
- **Hors ligne** : le QR code reste affiché sans réseau ; une file de scans hors ligne au comptoir serait la suite logique.
- **Photos de plats** : fichiers statiques du back-office ; un envoi depuis l'interface demanderait un stockage d'objets.



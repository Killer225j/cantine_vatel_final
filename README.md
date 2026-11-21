# Cantine Vatel

Application de gestion de la cantine de Vatel Abidjan — Hackathon Restauration Vatel × Epitech, novembre 2026.

**Zéro file, zéro gaspi, zéro risque** : réservation par créneau avec QR code, prévision des portions à préparer, alerte allergie au comptoir, paiement Mobile Money.

| Dossier | Rôle | Stack | Déploiement |
|---|---|---|---|
| [`backend/`](backend) | API REST + Swagger | NestJS 10, Prisma 5, PostgreSQL | Render (`render.yaml`) |
| [`backoffice/`](backoffice) | Administration et cuisine | Angular 18, Angular Material, PrimeIcons, Tailwind | Vercel (`backoffice/vercel.json`) |
| [`mobile/`](mobile) | Élèves et parents | Expo SDK 58, expo-router 58, React Native 0.88 | APK via EAS (`mobile/eas.json`) |

Les trois dossiers sont indépendants (un `package.json` chacun, pas de workspaces).

## Rôles

| Rôle | Application | Ce qu'il fait |
|---|---|---|
| `ELEVE` | Mobile | Consulte le menu, réserve un créneau, présente son QR code |
| `PARENT` | Mobile | Recharge le compte de son enfant, suit ses repas |
| `ADMIN` | Back-office | Menus, statistiques, rapports |
| `CUISINE` | Back-office | Commandes du jour, scan au comptoir, stocks |

## Lancer en local

Prérequis : Node 22+, PostgreSQL, yarn (backend) et npm (back-office, mobile).

> Pas de Postgres sous la main ? Une base de dev jetable suffit :
> `npx -y -p @electric-sql/pglite -p @electric-sql/pglite-socket pglite-server --db=./.pglite --port=5434 --max-connections=10`
> puis `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/postgres?sslmode=disable&connection_limit=1&pgbouncer=true"`.

### 1. API — `backend/`

```bash
cd backend
cp .env.example .env          # puis renseigner DATABASE_URL et deux secrets JWT
yarn install
yarn migrate:deploy           # crée les tables
yarn seed                     # comptes de démonstration
yarn start:dev                # http://localhost:3000/api/v1 — Swagger : /api/docs
```

### 2. Back-office — `backoffice/`

```bash
cd backoffice
npm install
npm start                     # http://localhost:4200
```

### 3. Mobile — `mobile/`

```bash
cd mobile
cp .env.example .env          # EXPO_PUBLIC_API_URL = IP du poste sur le réseau local, port 3000
npm install
npm start                     # puis scanner le QR avec Expo Go, ou touche « w » pour le navigateur
```

Si `npm start` s'arrête sur `TypeError: fetch failed` (Expo n'arrive pas à joindre ses serveurs), lancer en mode hors ligne : PowerShell `$env:EXPO_OFFLINE=1; npx expo start --lan`, Git Bash `EXPO_OFFLINE=1 npx expo start --lan`.

L'appli est en **Expo SDK 58** : elle s'ouvre avec l'Expo Go actuel de l'App Store et du Play Store (iPhone compris).

## Couleurs

Couleurs de l'école Vatel : le bleu ciel du logo (`#87c1eb`) pour les accents, et des bleus profonds de la même teinte pour les actions et la navigation (`#1b6fa8`, `#155e93`, `#0d3a5c`), lisibles sur fond blanc. Tout est centralisé :

- back-office : palette Tailwind `vatel` dans `backoffice/tailwind.config.js`, variables `$vatel-*` dans `backoffice/src/styles.scss`, jetons `$cv-*` dans `backoffice/src/app/shared/styles/_tokens.scss`, thème Material (`mat.$azure-palette`) ;
- mobile : `mobile/src/constants/colors.ts` ;
- logos : `backoffice/public/logo.svg` et `mobile/assets/*.png`.

## Comptes de démonstration

Créés par `yarn seed`, mot de passe commun **`Cantine2026!`** :

| Rôle | Email |
|---|---|
| Administration | `admin@vatel.ci` |
| Cuisine | `cuisine@vatel.ci` |
| Parent | `parent@vatel.ci` |
| Élève | `eleve@vatel.ci` |

## Déploiement

- **API + base** : Render → *New → Blueprint* → ce repo (lit `render.yaml`). Renseigner ensuite `CORS_ORIGINS` avec l'URL Vercel. Seed de la base distante depuis le poste : `DATABASE_URL="<External Database URL>" yarn seed`.
- **Back-office** : Vercel → *Import* → ce repo, *Root Directory* = `backoffice`. L'URL de l'API est dans `src/environments/environment.prod.ts`.
- **APK** : `cd mobile && npx eas-cli init` (une fois), puis `npx eas-cli build -p android --profile preview`. L'URL de l'API est dans `eas.json`.

L'offre gratuite de Render met l'API en veille après 15 min : ouvrir `/api/v1/health` une minute avant une démo.

## Qualité

- `backend` : `yarn lint`, `yarn test`, `yarn build`
- `backoffice` : `npm run test:ci`, `npm run build`
- `mobile` : `npm run typecheck`

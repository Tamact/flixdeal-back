# Flixdeal - Backend (Node.js, Express, Prisma)

Backend TypeScript pour la plateforme Flixdeal: API REST avec Express, base de données via Prisma (PostgreSQL), authentification JWT, gestion des produits et commandes, endpoints support/FAQ et intégration paiement CinetPay (création et notification de transaction).

## Sommaire
- Aperçu du projet
- Pile technique
- Structure du projet
- Prérequis
- Installation & configuration
- Scripts NPM
- Base de données (Prisma)
- Données de démonstration (seed)
- Démarrage
- Endpoints principaux
- Modèles Prisma
- Sécurité & bonnes pratiques
- Dépannage

## Aperçu
- Authentification JWT: inscription, connexion, profil (`/api/auth/signup`, `/api/auth/login`, `/api/me`).
- Catalogue produits: `/api/products`.
- Commandes: création et consultation (`/api/orders`, `/api/orders/:id`).
- Support (tickets en mémoire): création et lecture (`/api/support/tickets`).
- FAQ statique: `/api/faq`.
- Paiement CinetPay: création (`/api/pay`) et webhook de notification (`/api/cinetpay/notify`).

## Pile technique
- Node.js + Express
- TypeScript
- Prisma ORM + PostgreSQL
- JWT (jsonwebtoken)
- Bcrypt / bcryptjs
- CORS, dotenv, axios

## Structure du projet
```
.
├─ src/
│  ├─ index.ts            # Point d'entrée API
│  └─ seed-user.ts        # Seed utilisateur de test
├─ prisma/
│  ├─ schema.prisma       # Schéma Prisma (User, Product, Order)
│  ├─ seed.ts             # Seed produits
│  └─ migrations/         # Migrations Prisma
├─ dist/                  # Build JS compilé
├─ types/                 # Types additionnels (si besoin)
├─ package.json
├─ tsconfig.json
└─ README.md
```

## Prérequis
- Node.js 18+
- PostgreSQL (une base accessible via `DATABASE_URL`)

## Installation & configuration
1) Cloner le dépôt puis installer les dépendances:
```bash
npm install
```

2) Créer un fichier `.env` à la racine avec les variables nécessaires:
```bash
# Application
PORT=3001
JWT_SECRET=remplace_moi_par_un_secret_fort

# Base de données
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"

# CinetPay
CINETPAY_API_KEY=your_cinetpay_api_key
CINETPAY_SITE_ID=your_cinetpay_site_id
```

3) (Optionnel) Ajuster les origines autorisées CORS dans `src/index.ts` si besoin.

## Scripts NPM
- `npm run dev` : démarrage en développement (ts-node-dev)
- `npm run build` : compilation TypeScript → `dist/`
- `npm start` : démarrage en production (`node dist/index.js`)
- `npm run prisma:generate` : générer le client Prisma
- `npm run prisma:migrate` : migration en dev (`prisma migrate dev`)
- `npm run seed:user` : insérer/mettre à jour un utilisateur de test

## Base de données (Prisma)
1) Appliquer les migrations et générer le client:
```bash
npm run prisma:migrate
npm run prisma:generate
```

2) Vérifier la connexion à la base via `DATABASE_URL`.

## Données de démonstration (seed)
- Produits: `prisma/seed.ts`
```bash
npx ts-node prisma/seed.ts
```
- Utilisateur de test: `src/seed-user.ts`
```bash
npm run seed:user
```
L’utilisateur de test créé (email/mot de passe) est visible dans la sortie de la commande. Par défaut: `test@account-flow-vault.com` / `test123`.

## Démarrage
- Dev:
```bash
npm run dev
```
- Prod:
```bash
npm run build && npm start
```
L’API écoute par défaut sur `http://localhost:3001` (configurable via `PORT`).

## Endpoints principaux
- Authentification
  - `POST /api/auth/signup` — { email, password, nom?, prenom? } → crée un utilisateur.
  - `POST /api/auth/login` — { email, password } → renvoie `{ token, user }`.
  - `GET /api/me` — nécessite `Authorization: Bearer <token>` → infos utilisateur.

- Produits
  - `GET /api/products` — liste des produits.

- Commandes (JWT requis)
  - `POST /api/orders` — { productId, status? } → crée une commande (status par défaut: "pending").
  - `GET /api/orders` — liste des commandes de l’utilisateur connecté.
  - `GET /api/orders/:id` — détail d’une commande si elle appartient à l’utilisateur.

- Support (en mémoire, non persisté)
  - `POST /api/support/tickets` — { sujet, message } → crée un ticket.
  - `GET /api/support/tickets` — liste des tickets de l’utilisateur.
  - `GET /api/support/tickets/:id` — détail d’un ticket de l’utilisateur.

- FAQ
  - `GET /api/faq` — retourne un tableau Q/R statique.

- Paiement (CinetPay)
  - `POST /api/pay` — { amount, cart?, phone, currency?="XOF" }
    - Retourne `payment_url` si la création de paiement est OK.
    - Utilise `CINETPAY_API_KEY` et `CINETPAY_SITE_ID`.
  - `POST /api/cinetpay/notify` — webhook CinetPay
    - Entrée: `{ transaction_id }`
    - Vérifie le statut via CinetPay, puis met à jour `Order.status` → `paid` si accepté.

Notes:
- Pour les routes protégées: ajouter l’en-tête `Authorization: Bearer <JWT>`.
- Les validations sont minimales: adapter selon vos besoins.

## Modèles Prisma (extrait)
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  nom       String?
  prenom    String?
  orders    Order[]
}

model Product {
  id            Int     @id @default(autoincrement())
  name          String
  description   String
  price         Float
  originalPrice Float
  category      String
  stock         Int
  icon          String
  color         String
  duration      String
  features      String
  popular       Boolean
  rating        Float
  reviews       Int
  orders        Order[]
}

model Order {
  id            Int      @id @default(autoincrement())
  userId        Int
  productId     Int
  status        String
  createdAt     DateTime @default(now())
  transactionId String?
  product       Product  @relation(fields: [productId], references: [id])
  user          User     @relation(fields: [userId], references: [id])
}
```

## Sécurité & bonnes pratiques
- Définir un `JWT_SECRET` fort en production (ne pas utiliser la valeur par défaut).
- Restreindre `CORS` aux domaines strictement nécessaires.
- Gérer les erreurs et validations d’entrées côté serveur (celebrate/zod/yup recommandé).
- Ne jamais commiter vos secrets `.env`.
- Vérifier les dépendances et mettre à jour régulièrement.

## Dépannage
- « Cannot connect to database »: vérifier `DATABASE_URL` et que PostgreSQL est accessible.
- « JWT invalid/expired »: renvoyer un nouveau token via la connexion.
- « Prisma client not generated »: exécuter `npm run prisma:generate`.
- Paiement CinetPay: vérifier `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, et les URLs `notify_url/return_url` utilisées.

---
Licence: ISC (cf. `package.json`).

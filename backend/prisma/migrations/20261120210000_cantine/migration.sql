-- CreateEnum
CREATE TYPE "CategoriePlat" AS ENUM ('ENTREE', 'PLAT', 'DESSERT', 'BOISSON');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('CONFIRMEE', 'SERVIE', 'ANNULEE', 'ABSENT');

-- CreateEnum
CREATE TYPE "TypeTransaction" AS ENUM ('RECHARGE', 'REPAS', 'REMBOURSEMENT');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY');

-- CreateEnum
CREATE TYPE "StatutTransaction" AS ENUM ('EN_ATTENTE', 'REUSSIE', 'ECHOUEE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "classe" TEXT,
ADD COLUMN     "codeLiaison" TEXT;

-- CreateTable
CREATE TABLE "liens_parent" (
    "parentId" TEXT NOT NULL,
    "enfantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liens_parent_pkey" PRIMARY KEY ("parentId","enfantId")
);

-- CreateTable
CREATE TABLE "allergenes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "allergenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plats" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorie" "CategoriePlat" NOT NULL DEFAULT 'PLAT',
    "prix" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "vegetarien" BOOLEAN NOT NULL DEFAULT false,
    "poidsPortionG" INTEGER NOT NULL DEFAULT 350,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus_jour" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "publie" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "menus_jour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "menuJourId" TEXT NOT NULL,
    "platId" TEXT NOT NULL,
    "portionsPrevues" INTEGER NOT NULL DEFAULT 0,
    "prixAntiGaspi" INTEGER,
    "antiGaspiJusqua" TIMESTAMP(3),

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creneaux" (
    "id" TEXT NOT NULL,
    "menuJourId" TEXT NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,

    CONSTRAINT "creneaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "creneauId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "prix" INTEGER NOT NULL,
    "antiGaspi" BOOLEAN NOT NULL DEFAULT false,
    "statut" "StatutReservation" NOT NULL DEFAULT 'CONFIRMEE',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servieLe" TIMESTAMP(3),
    "servieParId" TEXT,
    "controleAllergie" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portefeuilles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "solde" INTEGER NOT NULL DEFAULT 0,
    "seuilAlerte" INTEGER NOT NULL DEFAULT 2000,

    CONSTRAINT "portefeuilles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "portefeuilleId" TEXT NOT NULL,
    "type" "TypeTransaction" NOT NULL,
    "montant" INTEGER NOT NULL,
    "moyen" "MoyenPaiement",
    "statut" "StatutTransaction" NOT NULL DEFAULT 'REUSSIE',
    "reference" TEXT,
    "payeurId" TEXT,
    "reservationId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "etoiles" INTEGER NOT NULL,
    "commentaire" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles_stock" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL,
    "seuilAlerte" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "articles_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "delta" DECIMAL(10,2) NOT NULL,
    "motif" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AllergeneToPlat" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AllergeneToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "allergenes_code_key" ON "allergenes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plats_slug_key" ON "plats"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "menus_jour_date_key" ON "menus_jour"("date");

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_menuJourId_platId_key" ON "menu_items"("menuJourId", "platId");

-- CreateIndex
CREATE UNIQUE INDEX "creneaux_menuJourId_heureDebut_key" ON "creneaux"("menuJourId", "heureDebut");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_code_key" ON "reservations"("code");

-- CreateIndex
CREATE INDEX "reservations_userId_date_idx" ON "reservations"("userId", "date");

-- CreateIndex
CREATE INDEX "reservations_date_statut_idx" ON "reservations"("date", "statut");

-- CreateIndex
CREATE INDEX "reservations_creneauId_statut_idx" ON "reservations"("creneauId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "portefeuilles_userId_key" ON "portefeuilles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_portefeuilleId_creeLe_idx" ON "transactions"("portefeuilleId", "creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "notes_reservationId_key" ON "notes"("reservationId");

-- CreateIndex
CREATE INDEX "notes_platId_idx" ON "notes"("platId");

-- CreateIndex
CREATE INDEX "notifications_userId_lue_idx" ON "notifications"("userId", "lue");

-- CreateIndex
CREATE UNIQUE INDEX "articles_stock_nom_key" ON "articles_stock"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "_AllergeneToPlat_AB_unique" ON "_AllergeneToPlat"("A", "B");

-- CreateIndex
CREATE INDEX "_AllergeneToPlat_B_index" ON "_AllergeneToPlat"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AllergeneToUser_AB_unique" ON "_AllergeneToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_AllergeneToUser_B_index" ON "_AllergeneToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "users_codeLiaison_key" ON "users"("codeLiaison");

-- AddForeignKey
ALTER TABLE "liens_parent" ADD CONSTRAINT "liens_parent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liens_parent" ADD CONSTRAINT "liens_parent_enfantId_fkey" FOREIGN KEY ("enfantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menuJourId_fkey" FOREIGN KEY ("menuJourId") REFERENCES "menus_jour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_platId_fkey" FOREIGN KEY ("platId") REFERENCES "plats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creneaux" ADD CONSTRAINT "creneaux_menuJourId_fkey" FOREIGN KEY ("menuJourId") REFERENCES "menus_jour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_creneauId_fkey" FOREIGN KEY ("creneauId") REFERENCES "creneaux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_servieParId_fkey" FOREIGN KEY ("servieParId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portefeuilles" ADD CONSTRAINT "portefeuilles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_portefeuilleId_fkey" FOREIGN KEY ("portefeuilleId") REFERENCES "portefeuilles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_platId_fkey" FOREIGN KEY ("platId") REFERENCES "plats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergeneToPlat" ADD CONSTRAINT "_AllergeneToPlat_A_fkey" FOREIGN KEY ("A") REFERENCES "allergenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergeneToPlat" ADD CONSTRAINT "_AllergeneToPlat_B_fkey" FOREIGN KEY ("B") REFERENCES "plats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergeneToUser" ADD CONSTRAINT "_AllergeneToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "allergenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergeneToUser" ADD CONSTRAINT "_AllergeneToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


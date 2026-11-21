-- Index sur les clés étrangères et filtres des rapports (audit de performance).
CREATE INDEX "reservations_menuItemId_idx" ON "reservations"("menuItemId");
CREATE INDEX "transactions_type_statut_creeLe_idx" ON "transactions"("type", "statut", "creeLe");
CREATE INDEX "transactions_reservationId_idx" ON "transactions"("reservationId");
CREATE INDEX "liens_parent_enfantId_idx" ON "liens_parent"("enfantId");

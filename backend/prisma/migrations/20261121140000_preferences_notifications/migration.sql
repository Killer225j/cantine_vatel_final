-- Préférences de notification de l'utilisateur (solde bas, récap quotidien, alerte allergie).
ALTER TABLE "users" ADD COLUMN "preferencesNotif" JSONB;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function seedUser() {
    try {
        // Hasher le mot de passe
        const hashedPassword = await bcryptjs_1.default.hash("test123", 10);
        // Créer ou mettre à jour l'utilisateur de test
        const user = await prisma.user.upsert({
            where: { email: "test@account-flow-vault.com" },
            update: {
                nom: "Diallo",
                prenom: "Mamadou",
            },
            create: {
                email: "test@account-flow-vault.com",
                password: hashedPassword,
                nom: "Diallo",
                prenom: "Mamadou",
            },
        });
        console.log("✅ Utilisateur de test créé avec succès:");
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Nom: ${user.prenom} ${user.nom}`);
        console.log(`🔑 Mot de passe: test123`);
        console.log(`🆔 ID: ${user.id}`);
    }
    catch (error) {
        console.error("❌ Erreur lors de la création de l'utilisateur:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
seedUser();

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "vraiment_pas_secure_change_moi"; // Mets une vraie valeur secrète dans .env

app.use(
  cors({
    origin: ["http://localhost:8080", "https://flixdeal.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

// Type personnalisé pour req.user
interface AuthRequest extends express.Request {
  user?: { userId: number; email: string };
}

// Middleware d'authentification JWT
function authenticateToken(
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    res.sendStatus(401);
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.sendStatus(403);
      return;
    }
    req.user = user as { userId: number; email: string };
    next();
  });
}

// Exemple d'endpoint : liste des produits
app.get(
  "/api/products",
  async (req: express.Request, res: express.Response) => {
    const products = await prisma.product.findMany();
    res.json(products);
  }
);

// Exemple d'endpoint : inscription utilisateur
app.post(
  "/api/auth/signup",
  async (req: express.Request, res: express.Response) => {
    const { email, password, nom, prenom } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, nom, prenom },
      });
      res.json({
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
      });
    } catch (err) {
      res.status(400).json({ error: "Utilisateur déjà existant ou erreur" });
    }
  }
);

// Exemple d'endpoint : connexion utilisateur
app.post(
  "/api/auth/login",
  async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Utilisateur non trouvé" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Mot de passe incorrect" });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user.id, email: user.email } });
  }
);

app.get(
  "/api/me",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      res.sendStatus(404);
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
    });
  }
);

// Définir une interface pour les tickets (support)
interface Ticket {
  id: number;
  userId: number;
  sujet: string;
  message: string;
  status: string;
  createdAt: Date;
}

// --- Support (Tickets) ---
// Simule un modèle Ticket en mémoire si non présent dans Prisma
const tickets: Ticket[] = [];
let ticketId = 1;

app.post(
  "/api/support/tickets",
  authenticateToken,
  (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    const { sujet, message } = req.body;
    const ticket = {
      id: ticketId++,
      userId: req.user.userId,
      sujet,
      message,
      status: "open",
      createdAt: new Date(),
    };
    tickets.push(ticket);
    res.json(ticket);
  }
);

app.get(
  "/api/support/tickets",
  authenticateToken,
  (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    const userTickets = tickets.filter((t) => t.userId === req.user!.userId);
    res.json(userTickets);
  }
);

app.get(
  "/api/support/tickets/:id",
  authenticateToken,
  (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    const ticket = tickets.find(
      (t) => t.id === Number(req.params.id) && t.userId === req.user!.userId
    );
    if (!ticket) {
      res.sendStatus(404);
      return;
    }
    res.json(ticket);
  }
);

// --- FAQ (statique) ---
app.get("/api/faq", (req: express.Request, res: express.Response) => {
  const faq = [
    {
      question: "Comment recevoir mes identifiants après achat ?",
      answer:
        "Vos identifiants sont envoyés par email immédiatement après paiement.",
    },
    {
      question: "Que faire si mes identifiants ne fonctionnent pas ?",
      answer: "Contactez-nous via le support, nous vous aiderons rapidement.",
    },
    {
      question: "Puis-je obtenir un remboursement ?",
      answer: "Oui, sous 24h si le produit ne fonctionne pas.",
    },
    {
      question: "Combien de temps durent les abonnements ?",
      answer: "La durée varie selon le produit (1 mois, 3 mois, etc.).",
    },
    {
      question: "Les comptes sont-ils légaux et sécurisés ?",
      answer: "Oui, tous nos comptes sont légaux et sécurisés.",
    },
  ];
  res.json(faq);
});

// --- Commandes (Orders) ---
app.post(
  "/api/orders",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    const { productId, status } = req.body;
    try {
      const order = await prisma.order.create({
        data: {
          userId: req.user.userId,
          productId,
          status: status || "pending",
        },
        include: { product: true },
      });
      res.json(order);
    } catch (err) {
      res
        .status(400)
        .json({ error: "Erreur lors de la création de la commande" });
    }
  }
);

app.get(
  "/api/orders",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  }
);

app.get(
  "/api/orders/:id",
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: { product: true },
    });
    if (!order || order.userId !== req.user.userId) {
      res.sendStatus(404);
      return;
    }
    res.json(order);
  }
);

// --- Fin des routes ---

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur http://localhost:${PORT}`);
});

// Suppression de toute la logique paydunya dans la route /api/pay
app.post("/api/pay", async (req, res) => {
  const { amount, cart, phone, currency = "XOF" } = req.body;

  if (!phone || phone.length < 9) {
    return res
      .status(400)
      .json({ error: "Numéro de téléphone invalide ou manquant" });
  }

  // Construire la description du panier
  let description = "Achat sur Flixdeal";
  if (cart && cart.length) {
    description = cart
      .map((item) => `${item.quantity ? item.quantity + "x " : ""}${item.name}`)
      .join(", ");
  }

  const payload = {
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: "TX" + Date.now(),
    amount: Number(amount),
    currency,
    description,
    customer_name: "Client",
    customer_surname: "Flixdeal",
    customer_email: "client@email.com",
    customer_phone_number: phone,
    notify_url: "https://ton-backend.com/api/cinetpay/notify",
    return_url: "https://ton-frontend.com/paiement/retour",
    channels: "ALL",
  };

  console.log("[CINETPAY] Payload envoyé:", payload);

  try {
    const response = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment",
      payload
    );

    console.log("[CINETPAY] Réponse reçue:", response.data);

    if (response.data.code === "201") {
      res.json({ payment_url: response.data.data.payment_url });
    } else {
      res.status(500).json({ error: response.data.message });
    }
  } catch (err) {
    console.error(
      "[CINETPAY] Erreur lors de la requête:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cinetpay/notify", async (req, res) => {
  const { transaction_id } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ error: "transaction_id manquant" });
  }

  try {
    // Vérification du statut de la transaction auprès de CinetPay
    const response = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment/check",
      {
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id,
      }
    );

    if (
      response.data.code === "00" &&
      response.data.data.status === "ACCEPTED"
    ) {
      // Mise à jour de la commande dans la base Prisma
      await prisma.order.updateMany({
        where: { transactionId: transaction_id },
        data: { status: "paid" },
      });
      console.log(
        "Paiement accepté et commande validée pour la transaction",
        transaction_id
      );
      res.status(200).send("OK");
    } else {
      // Paiement non accepté ou en attente
      console.log(
        "Paiement non accepté ou en attente pour la transaction",
        transaction_id
      );
      res.status(200).send("NOT_OK");
    }
  } catch (err) {
    console.error("Erreur lors de la vérification CinetPay:", err.message);
    res.status(500).send("ERROR");
  }
});

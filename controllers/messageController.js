const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const User = require("../models/User");
const { logger } = require("../logging");

const OPHRUS_EMAIL = "ophrus@example.com";

// Obtenir l'ID de l'utilisateur Ophrus
const getOphrusUser = async () => {
  try {
    logger.debug("Recherche utilisateur Ophrus");
    const user = await User.findOne({ email: OPHRUS_EMAIL });
    if (!user) throw new Error("L'utilisateur Ophrus n'existe pas.");
    logger.debug(`Utilisateur Ophrus trouvé - ID: ${user._id}`);
    return user._id;
  } catch (error) {
    logger.error(`Erreur recherche utilisateur Ophrus: ${error.message}`, {
      stack: error.stack
    });
    throw error;
  }
};

/* ------------------------------------------------------------------ */
/* Envoyer un message                                                 */
/* ------------------------------------------------------------------ */
const envoyerMessage = asyncHandler(async (req, res) => {
  try {
    const destinataireId = req.params.receiverId;
    const { contenu } = req.body;
    logger.debug(`Envoi message - Exp: ${req.user._id}, Dest: ${destinataireId}`, {
      contenu: contenu.substring(0, 50) + (contenu.length > 50 ? "..." : "") // Log partiel du contenu
    });

    const message = await Message.create({
      expediteur: req.user._id,
      destinataire: destinataireId,
      contenu,
    });

    logger.info(`Message envoyé - ID: ${message._id}`);
    res.status(201).json(message);
  } catch (err) {
    logger.error(`Erreur envoi message: ${err.message}`, {
      stack: err.stack,
      expediteur: req.user?._id,
      destinataire: req.params?.receiverId
    });
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
});

/* ------------------------------------------------------------------ */
/* Envoyer un message à Ophrus par défaut                             */
/* ------------------------------------------------------------------ */
const contacterOphrus = asyncHandler(async (req, res) => {
  try {
    const { contenu } = req.body;
    logger.debug(`Contact Ophrus - Exp: ${req.user._id}`, {
      contenu: contenu.substring(0, 50) + (contenu.length > 50 ? "..." : "")
    });

    const ophrusId = await getOphrusUser();
    const message = await Message.create({
      expediteur: req.user._id,
      destinataire: ophrusId,
      contenu,
    });

    logger.info(`Message à Ophrus envoyé - ID: ${message._id}`);
    res.status(201).json({ message: "Message envoyé à Ophrus.", data: message });
  } catch (err) {
    logger.error(`Erreur contact Ophrus: ${err.message}`, {
      stack: err.stack,
      expediteur: req.user?._id
    });
    res.status(500).json({ message: "Erreur lors de l'envoi à Ophrus" });
  }
});

/* ------------------------------------------------------------------ */
/* Récupérer les messages avec un utilisateur                         */
/* ------------------------------------------------------------------ */
const getMessagesAvec = asyncHandler(async (req, res) => {
  try {
    const autreId = req.params.userId;
    logger.debug(`Récupération conversation - User1: ${req.user._id}, User2: ${autreId}`);

    const messages = await Message.find({
      $or: [
        { expediteur: req.user._id, destinataire: autreId },
        { expediteur: autreId, destinataire: req.user._id },
      ],
    })
    .populate("expediteur", "nom email")
    .populate("destinataire", "nom email")
    .sort({ createdAt: 1 });

    logger.info(`Conversation récupérée - Messages: ${messages.length}`);
    res.json(messages);
  } catch (err) {
    logger.error(`Erreur récupération conversation: ${err.message}`, {
      stack: err.stack,
      userId: req.params?.userId
    });
    res.status(500).json({ message: "Erreur lors de la récupération des messages" });
  }
});

const PAGE_SIZE_DEFAULT = 10;

/* ---------- Nombre total de messages non lus ---------- */
const getUnreadCount = asyncHandler(async (req, res) => {
  try {
    logger.debug(`Récupération messages non lus - User: ${req.user._id}`);
    
    const unread = await Message.countDocuments({
      destinataire: req.user._id,
      lu: false,
    });

    logger.info(`Messages non lus - User: ${req.user._id}, Total: ${unread}`);
    res.json({ unread });
  } catch (err) {
    logger.error(`Erreur récupération messages non lus: ${err.message}`, {
      stack: err.stack,
      userId: req.user?._id
    });
    res.status(500).json({ message: "Erreur lors du comptage des messages non lus" });
  }
});

/* ---------- Inbox paginée (un thread par utilisateur) ---------- */
const getInbox = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || PAGE_SIZE_DEFAULT;
    logger.debug(`Récupération inbox - User: ${req.user._id}, Page: ${page}, Limit: ${limit}`);

    const allMsgs = await Message.find({
      $or: [{ expediteur: req.user._id }, { destinataire: req.user._id }],
    }).sort({ createdAt: -1 });

    const threadsMap = new Map();
    allMsgs.forEach((m) => {
      const other = m.expediteur.toString() === req.user._id.toString()
        ? m.destinataire.toString()
        : m.expediteur.toString();

      if (!threadsMap.has(other)) {
        threadsMap.set(other, { dernier: m, nonLus: 0 });
      }
      if (!m.lu && m.destinataire.toString() === req.user._id.toString()) {
        threadsMap.get(other).nonLus += 1;
      }
    });

    const threads = Array.from(threadsMap.entries());
    const totalThreads = threads.length;
    const totalPages = Math.ceil(totalThreads / limit);
    const start = (page - 1) * limit;
    const paginated = threads.slice(start, start + limit);

    const result = await Promise.all(
      paginated.map(async ([userId, data]) => {
        const user = await User.findById(userId).select("nom email");
        return { 
          correspondant: user, 
          dernierMessage: data.dernier, 
          nonLus: data.nonLus 
        };
      })
    );

    logger.info(`Inbox récupérée - User: ${req.user._id}, Threads: ${result.length}/${totalThreads}`);
    res.json({ page, limit, totalThreads, totalPages, threads: result });
  } catch (err) {
    logger.error(`Erreur récupération inbox: ${err.message}`, {
      stack: err.stack,
      userId: req.user?._id
    });
    res.status(500).json({ message: "Erreur lors de la récupération de la boîte de réception" });
  }
});

/* ---------- Marquer un message comme lu ---------- */
const markMessageRead = asyncHandler(async (req, res) => {
  try {
    const messageId = req.params.id;
    logger.debug(`Marquage message comme lu - ID: ${messageId}, User: ${req.user._id}`);

    const msg = await Message.findById(messageId);
    if (!msg) {
      logger.warn(`Message introuvable - ID: ${messageId}`);
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (msg.destinataire.toString() !== req.user._id.toString()) {
      logger.warn(`Tentative non autorisée de marquage message - User: ${req.user._id}, Message: ${messageId}`);
      return res.status(403).json({ message: "Non autorisé." });
    }

    msg.lu = true;
    await msg.save();
    logger.info(`Message marqué comme lu - ID: ${messageId}`);
    res.json({ message: "Message marqué comme lu." });
  } catch (err) {
    logger.error(`Erreur marquage message comme lu: ${err.message}`, {
      stack: err.stack,
      messageId: req.params?.id
    });
    res.status(500).json({ message: "Erreur lors du marquage du message" });
  }
});

/* ---------- Marquer toute la conversation comme lue ---------- */
const markThreadRead = asyncHandler(async (req, res) => {
  try {
    const otherId = req.params.userId;
    logger.debug(`Marquage conversation comme lue - User1: ${req.user._id}, User2: ${otherId}`);

    const result = await Message.updateMany(
      {
        destinataire: req.user._id,
        expediteur: otherId,
        lu: false,
      },
      { $set: { lu: true } }
    );

    logger.info(`Conversation marquée comme lue - Messages modifiés: ${result.modifiedCount}`);
    res.json({ message: "Conversation marquée comme lue." });
  } catch (err) {
    logger.error(`Erreur marquage conversation comme lue: ${err.message}`, {
      stack: err.stack,
      userId: req.params?.userId
    });
    res.status(500).json({ message: "Erreur lors du marquage de la conversation" });
  }
});

module.exports = {
  envoyerMessage,
  contacterOphrus,
  getMessagesAvec, 
  getUnreadCount,
  getInbox,
  markMessageRead,
  markThreadRead,
};
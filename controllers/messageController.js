const asyncHandler = require("express-async-handler");
const Message = require("../models/Message");
const User = require("../models/User");

const OPHRUS_EMAIL = "ophrus@example.com"; // Change selon l'adresse utilisée

// Obtenir l'ID de l'utilisateur Ophrus (à utiliser comme valeur par défaut)
const getOphrusUser = async () => {
  const user = await User.findOne({ email: OPHRUS_EMAIL });
  if (!user) throw new Error("L'utilisateur Ophrus n'existe pas.");
  return user._id;
};

/* ------------------------------------------------------------------ */
/* Envoyer un message                                                 */
/* ------------------------------------------------------------------ */
const envoyerMessage = asyncHandler(async (req, res) => {
  const destinataireId = req.params.receiverId;  // ✅ ID via l’URL
  const { contenu } = req.body;

  const message = await Message.create({
    expediteur: req.user._id,
    destinataire: destinataireId,
    contenu,
  });

  res.status(201).json(message);
});

/* ------------------------------------------------------------------ */
/* Envoyer un message à Ophrus par défaut                             */
/* ------------------------------------------------------------------ */
const contacterOphrus = asyncHandler(async (req, res) => {
  const { contenu } = req.body;

  const ophrusId = await getOphrusUser();

  const message = await Message.create({
    expediteur: req.user._id,
    destinataire: ophrusId,
    contenu,
  });

  res.status(201).json({ message: "Message envoyé à Ophrus.", data: message });
});

/* ------------------------------------------------------------------ */
/* Récupérer les messages avec un utilisateur                         */
/* ------------------------------------------------------------------ */
const getMessagesAvec = asyncHandler(async (req, res) => {
  const autreId = req.params.userId;

  const messages = await Message.find({
    $or: [
      { expediteur: req.user._id, destinataire: autreId },
      { expediteur: autreId, destinataire: req.user._id },
    ],
  })
    .populate("expediteur", "nom email")
    .populate("destinataire", "nom email")
    .sort({ createdAt: 1 });

  res.json(messages);
});

const PAGE_SIZE_DEFAULT = 10;

/* ---------- Nombre total de messages non lus ---------- */
const getUnreadCount = asyncHandler(async (req, res) => {
  const unread = await Message.countDocuments({
    destinataire: req.user._id,
    lu: false,
  });
  res.json({ unread });
});

/* ---------- Inbox paginée (un thread par utilisateur) ---------- */
const getInbox = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || PAGE_SIZE_DEFAULT;

  // Récupère tous les messages (expéditeur OU destinataire = moi)
  const allMsgs = await Message.find({
    $or: [{ expediteur: req.user._id }, { destinataire: req.user._id }],
  }).sort({ createdAt: -1 });

  // Agrège par autre utilisateur
  const threadsMap = new Map();
  allMsgs.forEach((m) => {
    const other =
      m.expediteur.toString() === req.user._id.toString()
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

  // Peupler les infos utilisateur
  const result = await Promise.all(
    paginated.map(async ([userId, data]) => {
      const user = await User.findById(userId).select("nom email");
      return { correspondant: user, dernierMessage: data.dernier, nonLus: data.nonLus };
    })
  );

  res.json({ page, limit, totalThreads, totalPages, threads: result });
});

/* ---------- Marquer un message comme lu ---------- */
const markMessageRead = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ message: "Message introuvable." });

  if (msg.destinataire.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Non autorisé." });

  msg.lu = true;
  await msg.save();
  res.json({ message: "Message marqué comme lu." });
});

/* ---------- Marquer toute la conversation comme lue ---------- */
const markThreadRead = asyncHandler(async (req, res) => {
  const otherId = req.params.userId;

  await Message.updateMany(
    {
      destinataire: req.user._id,
      expediteur: otherId,
      lu: false,
    },
    { $set: { lu: true } }
  );

  res.json({ message: "Conversation marquée comme lue." });
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
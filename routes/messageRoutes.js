// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  envoyerMessage,
  contacterOphrus,
  getMessagesAvec,
  getUnreadCount,
  getInbox,
  markMessageRead,
  markThreadRead,
} = require("../controllers/messageController");
const { validateMessage } = require("../middlewares/validators/messageValidator");

//  ⚠️  D’abord les routes fixes, ensuite la route paramétrique
router.post("/ophrus", protect, contacterOphrus);
router.get("/unread",  protect, getUnreadCount);
router.get("/inbox",   protect, getInbox);
router.patch("/thread/:userId/read", protect, markThreadRead);
router.patch("/:id/read",            protect, markMessageRead);
router.get("/:userId",               protect, getMessagesAvec);

// ▶️ Route dynamique pour envoyer un message à un utilisateur
router.post("/:receiverId", protect, validateMessage, envoyerMessage);

module.exports = router;

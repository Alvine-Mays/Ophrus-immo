const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  validateUser,
  validateLogin,
  validateResetRequest,
  validateResetVerify,
  validateResetPassword,
  resetRequestLimiter,
} = require("../middlewares/security");

const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  refreshToken,
  searchUsers,
  deleteUser,
  requestPasswordReset,
  verifyResetCode,
  resetPasswordWithCode,
} = require("../controllers/userController");

// ROUTES PUBLIQUES
router.post("/register", validateUser, registerUser);
router.post("/login", validateLogin, loginUser);
router.post("/logout", logoutUser);
router.post("/refresh-token", refreshToken);
router.post("/reset-request", validateResetRequest, resetRequestLimiter, requestPasswordReset);
router.post("/reset-verify", validateResetVerify, verifyResetCode);
router.post("/reset-password", validateResetPassword, resetPasswordWithCode);

// ROUTES PROTÉGÉES
router.get("/profil", protect, getUser);
router.put("/:id", protect, updateUser);
router.get("/search", protect, searchUsers);
router.delete("/users/:id", protect, deleteUser);

module.exports = router;

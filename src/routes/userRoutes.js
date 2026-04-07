const express = require("express");
const router = express.Router();

const {
  register,
  login,
  forgetPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  getReferralStats,
  updateBankAccount,
  getBankAccount,
} = require("../controllers/userController");

const { protect } = require("../middleware/auth");

// ─── Public Routes ────────────────────────────────────────────────────────────
// POST /api/users/register
router.post("/register", register);

// POST /api/users/login
router.post("/login", login);

// POST /api/users/forget-password
router.post("/forget-password", forgetPassword);

// POST /api/users/reset-password/:token
router.post("/reset-password/:token", resetPassword);

// ─── Protected Routes (JWT required) ─────────────────────────────────────────
// GET  /api/users/profile  — fetch my profile
router.get("/profile", protect, getProfile);

// PUT  /api/users/profile  — update profile info (email, phone, className, etc.)
router.put("/profile", protect, updateProfile);

// PUT  /api/users/change-password  — change password (from profile screen security section)
router.put("/change-password", protect, changePassword);

// GET  /api/users/referral-stats  — get referral coins and count
router.get("/referral-stats", protect, getReferralStats);

// PUT  /api/users/bank-account  — update Nigerian bank account details
router.put("/bank-account", protect, updateBankAccount);

// GET  /api/users/bank-account  — get Nigerian bank account details
router.get("/bank-account", protect, getBankAccount);

module.exports = router;

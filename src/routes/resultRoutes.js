const express = require("express");
const router = express.Router();

const {
  submitResult,
  getMyResults,
  getResultDetail,
  getResultQuestions,
  getResultsByExam,
} = require("../controllers/resultController");

const { protect, restrictTo } = require("../middleware/auth");

// All result routes require authentication
router.use(protect);

// ── Student routes ─────────────────────────────────────────────────────────────
// POST /api/results/submit                        — submit exam attempt
// GET  /api/results/my                            — my result history (summary list)
// GET  /api/results/my/:resultId                  — one result summary
// GET  /api/results/my/:resultId/questions        — per-question breakdown (paginated)
router.post("/submit", submitResult);
router.get("/my", getMyResults);
router.get("/my/:resultId", getResultDetail);
router.get("/my/:resultId/questions", getResultQuestions);

// ── Admin routes ───────────────────────────────────────────────────────────────
// GET  /api/results/exam/:examId                  — all results for an exam
router.get("/exam/:examId", restrictTo("admin"), getResultsByExam);

module.exports = router;

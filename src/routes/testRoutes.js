const express = require("express");
const router = express.Router();

const {
  createQuestion,
  bulkCreateQuestions,
  getQuestionsByExam,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/testController");

const { protect, restrictTo } = require("../middleware/auth");

// All test routes require authentication
router.use(protect);

// ── Any authenticated user ─────────────────────────────────────────────────────
// GET  /api/tests?exam=<id>  — list all questions for an exam
// GET  /api/tests/:id        — single question
router.get("/", getQuestionsByExam);
router.get("/:id", getQuestionById);

// ── Admin only ─────────────────────────────────────────────────────────────────
// POST   /api/tests          — add one question
// POST   /api/tests/bulk     — add multiple questions
// PUT    /api/tests/:id      — update a question
// DELETE /api/tests/:id      — soft-delete a question
router.post("/bulk", restrictTo("admin"), bulkCreateQuestions);
router.post("/", restrictTo("admin"), createQuestion);
router.put("/:id", restrictTo("admin"), updateQuestion);
router.delete("/:id", restrictTo("admin"), deleteQuestion);

module.exports = router;

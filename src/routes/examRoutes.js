const express = require("express");
const router = express.Router();

const {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
} = require("../controllers/examController");

const { protect, restrictTo } = require("../middleware/auth");

// All exam routes require authentication
router.use(protect);

// ── Public (any authenticated user) ───────────────────────────────────────────
// GET  /api/exams           — list all active exams (filterable)
// GET  /api/exams/:id       — get a single exam
router.get("/", getAllExams);
router.get("/:id", getExamById);

// ── Admin only ─────────────────────────────────────────────────────────────────
// POST   /api/exams         — create exam
// PUT    /api/exams/:id     — update exam
// DELETE /api/exams/:id     — soft-delete exam
router.post("/", restrictTo("admin"), createExam);
router.put("/:id", restrictTo("admin"), updateExam);
router.delete("/:id", restrictTo("admin"), deleteExam);

module.exports = router;

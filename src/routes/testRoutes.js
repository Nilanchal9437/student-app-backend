const express = require("express");
const router = express.Router();

const {
  createQuestion,
  bulkCreateQuestions,
  getQuestionsBySubject,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/testController");

const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

// GET /api/tests?subject=<subjectId>  — list questions for a subject
// GET /api/tests/:id                  — single question
router.get("/", getQuestionsBySubject);
router.get("/:id", getQuestionById);

// POST   /api/tests/bulk — bulk create (admin)
// POST   /api/tests      — create one (admin)
// PUT    /api/tests/:id  — update (admin)
// DELETE /api/tests/:id  — soft-delete (admin)
router.post("/bulk", restrictTo("admin"), bulkCreateQuestions);
router.post("/", restrictTo("admin"), createQuestion);
router.put("/:id", restrictTo("admin"), updateQuestion);
router.delete("/:id", restrictTo("admin"), deleteQuestion);

module.exports = router;

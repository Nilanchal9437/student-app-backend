const express = require("express");
const router = express.Router();

const {
  getTermsByExam,
  getTermById,
  createTerm,
  deleteTerm,
} = require("../controllers/termController");

const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

// GET /api/terms?exam=<examId>  — list terms for an exam
// GET /api/terms/:id            — single term
router.get("/", getTermsByExam);
router.get("/:id", getTermById);

// POST   /api/terms      — create term (admin)
// DELETE /api/terms/:id  — delete term (admin)
router.post("/", restrictTo("admin"), createTerm);
router.delete("/:id", restrictTo("admin"), deleteTerm);

module.exports = router;

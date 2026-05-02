const express = require("express");
const router = express.Router();

const {
  getSubjectsByTerm,
  getSubjectById,
  createSubject,
  deleteSubject,
} = require("../controllers/subjectController");

const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

// GET /api/subjects?term=<termId>  — list subjects for a term
// GET /api/subjects/:id            — single subject
router.get("/", getSubjectsByTerm);
router.get("/:id", getSubjectById);

// POST   /api/subjects      — create subject (admin)
// DELETE /api/subjects/:id  — delete subject (admin)
router.post("/", restrictTo("admin"), createSubject);
router.delete("/:id", restrictTo("admin"), deleteSubject);

module.exports = router;

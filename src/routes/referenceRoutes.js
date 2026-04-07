const express = require("express");
const router = express.Router();

const {
  createReference,
  getReceivedReferences,
  getGivenReferences,
  getReferencesForUser,
  updateReference,
  deleteReference,
} = require("../controllers/referenceController");

const { protect } = require("../middleware/auth");

// ─── Protected Routes (JWT required) ─────────────────────────────────────────
// POST /api/references  — create a new reference for another student
router.post("/", protect, createReference);

// GET /api/references/received  — get all references I have received
router.get("/received", protect, getReceivedReferences);

// GET /api/references/given  — get all references I have given
router.get("/given", protect, getGivenReferences);

// PUT /api/references/:referenceId  — update a reference (only referrer can update)
router.put("/:referenceId", protect, updateReference);

// DELETE /api/references/:referenceId  — delete a reference (soft delete)
router.delete("/:referenceId", protect, deleteReference);

// ─── Public Routes ────────────────────────────────────────────────────────────
// GET /api/references/user/:userId  — get all public references for a user
router.get("/user/:userId", getReferencesForUser);

module.exports = router;

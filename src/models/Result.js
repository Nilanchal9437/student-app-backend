const mongoose = require("mongoose");

// ─── Result Schema ────────────────────────────────────────────────────────────
// Lightweight header document for one exam attempt by a student.
//
// Relationships:
//   Result → User  (the student — role must be "student")
//   Result → Exam  (which exam was attempted, stored as name snapshot too)
//
// Keeps only summary data. Per-question detail lives in TestResult collection
// (one document per question) linked back here via resultId.
//
// This design scales to thousands of questions per exam because no arrays
// grow inside this document.
// ─────────────────────────────────────────────────────────────────────────────
const resultSchema = new mongoose.Schema(
  {
    // ── Who attempted ─────────────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },

    // ── Which exam ────────────────────────────────────────────────────────────
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Exam reference is required"],
      index: true,
    },

    // Snapshot of exam name at submission time so the result stays readable
    // even if the exam document is later renamed / deleted.
    examName: {
      type: String,
      required: [true, "Exam name snapshot is required"],
      trim: true,
    },

    // ── Summary figures (computed after all TestResult docs are created) ──────
    totalQuestions: {
      type: Number,
      default: 0,
    },

    totalScore: {
      type: Number, // sum of scorePoint (0 or 1) across all TestResults
      default: 0,
    },

    percentage: {
      type: Number, // (totalScore / totalQuestions) × 100, rounded
      default: 0,
    },

    // ── Total duration of the entire exam attempt (seconds) ───────────────────
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [0, "Duration cannot be negative"],
    },

    // ── When submitted ────────────────────────────────────────────────────────
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Compound index: quickly fetch all attempts by a student sorted latest first
resultSchema.index({ user: 1, submittedAt: -1 });

module.exports = mongoose.model("Result", resultSchema);

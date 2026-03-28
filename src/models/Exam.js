const mongoose = require("mongoose");

// ─── Exam Schema ──────────────────────────────────────────────────────────────
// Represents a single exam paper / subject (e.g. "WAEC Mathematics 2024")
//
// Fields:
//   name      — display name of the exam
//   level     — academic level (Primary, JSS, SS, University, etc.)
//   isPremium — false = free access, true = paid/premium access
// ─────────────────────────────────────────────────────────────────────────────
const examSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true,
      maxlength: [150, "Exam name must be 150 characters or fewer"],
    },

    // ── Academic Level ─────────────────────────────────────────────────────────
    level: {
      type: String,
      required: [true, "Exam level is required"],
      trim: true,
    },

    // ── Access Type ────────────────────────────────────────────────────────────
    isPremium: {
      type: Boolean,
      default: false, // false = free, true = premium
    },

    // ── Status ─────────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// Text index for search
examSchema.index({ name: "text" });

module.exports = mongoose.model("Exam", examSchema);

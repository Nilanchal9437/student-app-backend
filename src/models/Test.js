const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Exam reference is required"],
    },

    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
      required: [true, "Term reference is required"],
      index: true,
    },
    // ── Relationship (FIXED) ──────────────────────────────────────────────────
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject reference is required"],
      index: true,
    },

    // ── Question ───────────────────────────────────────────────────────────────
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },

    // ── 4 Options (A, B, C, D) ─────────────────────────────────────────────────
    options: {
      A: {
        type: String,
        required: [true, "Option A is required"],
        trim: true,
      },
      B: {
        type: String,
        required: [true, "Option B is required"],
        trim: true,
      },
      C: {
        type: String,
        required: [true, "Option C is required"],
        trim: true,
      },
      D: {
        type: String,
        required: [true, "Option D is required"],
        trim: true,
      },
    },

    // ── Correct Answer ─────────────────────────────────────────────────────────
    answer: {
      type: String,
      required: [true, "Answer is required"],
      enum: ["A", "B", "C", "D"],
    },

    // ── Optional Extras ────────────────────────────────────────────────────────
    explanation: {
      type: String,
      trim: true,
      default: "",
    },

    marks: {
      type: Number,
      default: 1,
      min: [1, "Marks must be at least 1"],
    },

    // ── Order (per subject) ────────────────────────────────────────────────────
    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// ✅ FIXED INDEX (now based on subject, not exam)
testSchema.index({ subject: 1, order: 1 });

// Optional but recommended (avoid duplicate questions in same subject)
testSchema.index(
  { subject: 1, question: 1 },
  { unique: false }, // change to true if needed
);

module.exports = mongoose.model("Test", testSchema);

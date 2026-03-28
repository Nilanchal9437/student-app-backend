const mongoose = require("mongoose");

// ─── Test (Question) Schema ───────────────────────────────────────────────────
// Each document in this collection is one MCQ question belonging to an Exam.
//
// Relationship:  Test → Exam   (many questions belong to one exam)
//
// Fields:
//   exam      — ObjectId ref to the Exam collection
//   question  — the question text
//   options   — exactly 4 choices (A, B, C, D)
//   answer    — the correct option key: "A" | "B" | "C" | "D"
//   explanation (optional) — explanation of the correct answer
//   marks     — points awarded for a correct answer (default 1)
// ─────────────────────────────────────────────────────────────────────────────
const testSchema = new mongoose.Schema(
  {
    // ── Relationship ───────────────────────────────────────────────────────────
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Exam reference is required"],
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
      enum: {
        values: ["A", "B", "C", "D"],
        message: "Answer must be one of: A, B, C, D",
      },
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

    // ── Order hint (for displaying questions in sequence) ─────────────────────
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
  }
);

// Compound index: quickly fetch all questions for a given exam in order
testSchema.index({ exam: 1, order: 1 });

module.exports = mongoose.model("Test", testSchema);

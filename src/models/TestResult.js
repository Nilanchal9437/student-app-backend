const mongoose = require("mongoose");

// ─── TestResult Schema ────────────────────────────────────────────────────────
// Each document represents ONE question's answer within a single exam attempt.
//
// Relationship:
//   TestResult → Result   (via resultId — which attempt this belongs to)
//   TestResult → Test     (via questionId — which question was answered)
//
// Design rationale:
//   • One document = one question, NOT an embedded array.
//   • This keeps the Result document small regardless of question count.
//   • With thousands of questions per exam, fetching per-page or grouped
//     is trivially done with: TestResult.find({ result: resultId })
//
// Fields:
//   result        — ObjectId ref to the Result header document
//   question      — ObjectId ref to the Test (question) document
//   questionText  — snapshot of question text at submission time
//   answered      — what the student selected (A | B | C | D | null = skipped)
//   correctAnswer — the right answer key at submission time (snapshot)
//   scorePoint    — 0 (wrong/skipped) or 1 (correct)
//   duration      — seconds the student spent on this specific question
// ─────────────────────────────────────────────────────────────────────────────
const testResultSchema = new mongoose.Schema(
  {
    // ── Parent result ─────────────────────────────────────────────────────────
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: [true, "Result reference is required"],
      index: true,
    },

    // ── Which question ────────────────────────────────────────────────────────
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: [true, "Question reference is required"],
    },

    // Snapshot so the review is readable even if the question is later edited
    questionText: {
      type: String,
      required: [true, "Question text snapshot is required"],
      trim: true,
    },

    // ── All 4 answer options (snapshot at submission) ──────────────────────────
    // Stored as a flat object so any option can be read directly: options.A etc.
    options: {
      A: { type: String, required: true, trim: true },
      B: { type: String, required: true, trim: true },
      C: { type: String, required: true, trim: true },
      D: { type: String, required: true, trim: true },
    },

    // ── Student's response ────────────────────────────────────────────────────
    answered: {
      type: String,
      enum: {
        values: ["A", "B", "C", "D", null],
        message: "answered must be A, B, C, D or null (skipped)",
      },
      default: null, // null = question was not answered (timed out / skipped)
    },

    // ── Correct answer (snapshot at submission) ───────────────────────────────
    correctAnswer: {
      type: String,
      required: [true, "Correct answer snapshot is required"],
      enum: ["A", "B", "C", "D"],
    },

    // ── Score for this question: 0 = wrong/skipped, 1 = correct ──────────────
    scorePoint: {
      type: Number,
      required: true,
      enum: {
        values: [0, 1],
        message: "scorePoint must be 0 (wrong) or 1 (correct)",
      },
      default: 0,
    },

    // ── Time spent on this specific question (seconds) ────────────────────────
    duration: {
      type: Number,
      required: [true, "Question duration is required"],
      min: [0, "Duration cannot be negative"],
      default: 0,
    },

    // ── Display order (mirrors Test.order for correct sequencing) ─────────────
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index for fast bulk fetch of all answers for a given result
testResultSchema.index({ result: 1, order: 1 });

module.exports = mongoose.model("TestResult", testResultSchema);

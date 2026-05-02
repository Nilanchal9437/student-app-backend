const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    // ── Relationship ───────────────────────────────────────────────────────────
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Term",
      required: [true, "Term reference is required"],
      index: true,
    },

    // ✅ NEW: Subject Name
    subjectName: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ✅ FIXED index (was wrong before)
subjectSchema.index({ term: 1, subjectName: 1, order: 1 });

module.exports = mongoose.model("Subject", subjectSchema);

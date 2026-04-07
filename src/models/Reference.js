const mongoose = require("mongoose");

// ─── Reference Schema ──────────────────────────────────────────────────────────
// Students can create references for other students
// A reference contains relationship type, description, and timestamps
// ─────────────────────────────────────────────────────────────────────────────
const referenceSchema = new mongoose.Schema(
  {
    // ── Referrer (the student giving the reference) ────────────────────────────
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Referrer is required"],
      index: true,
    },

    // ── Referee (the student receiving the reference) ──────────────────────────
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Referee is required"],
      index: true,
    },

    // ── Relationship Type ──────────────────────────────────────────────────────
    relationship: {
      type: String,
      enum: {
        values: ["classmate", "friend", "study-partner", "mentor", "colleague"],
        message:
          "Relationship must be one of: classmate, friend, study-partner, mentor, colleague",
      },
      required: [true, "Relationship type is required"],
    },

    // ── Reference Description ─────────────────────────────────────────────────
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    // ── Rating (optional - out of 5) ───────────────────────────────────────────
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      default: 5,
    },

    // ── Status ─────────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Prevent duplicate references from same referrer to same referee
referenceSchema.index({ referrer: 1, referee: 1 }, { unique: true });

// Quick lookup of references for a specific referee
referenceSchema.index({ referee: 1 });

// Quick lookup of references given by a specific referrer
referenceSchema.index({ referrer: 1 });

module.exports = mongoose.model("Reference", referenceSchema);

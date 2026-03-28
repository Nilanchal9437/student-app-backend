const mongoose = require("mongoose");

// ─── Community Schema ──────────────────────────────────────────────────────────
// An exam-based discussion group. Linked to an Exam so each exam can
// have its own community where students discuss questions and strategy.
//
// Rules enforced:
//   • Only members (members array) can send messages.
//   • Admin (creator) can update name/description/close the group.
//   • isOpen — when false, no new joins are accepted.
// ─────────────────────────────────────────────────────────────────────────────
const communitySchema = new mongoose.Schema(
  {
    // ── Display info ──────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Community name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    // ── Link to exam ──────────────────────────────────────────────────────────
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Exam reference is required"],
      index: true,
    },

    // Snapshot of exam name for quick display without population
    examName: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Creator / admin ───────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator reference is required"],
    },

    // ── Members list ──────────────────────────────────────────────────────────
    // Each entry: { user: ObjectId, joinedAt: Date }
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ── Settings ──────────────────────────────────────────────────────────────
    isOpen: {
      type: Boolean,
      default: true, // true = anyone can join; false = closed by admin
    },

    maxMembers: {
      type: Number,
      default: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: member count
communitySchema.virtual("memberCount").get(function () {
  return this.members.length;
});

// Index for fast lookup of all communities for a given exam
communitySchema.index({ exam: 1, createdAt: -1 });

module.exports = mongoose.model("Community", communitySchema);

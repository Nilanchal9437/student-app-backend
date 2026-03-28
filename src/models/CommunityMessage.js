const mongoose = require("mongoose");

// ─── CommunityMessage Schema ───────────────────────────────────────────────────
// One document = one chat message in a community group.
//
// Key design decisions:
//   • text-only (no images/files) — matches product requirement.
//   • replyTo — an ObjectId pointing to the parent message for threaded replies.
//     Stores a snapshot of the parent (sender name + first 80 chars of text) so
//     the UI can render the reply without a second DB query.
//   • isDeleted / deletedAt — soft delete so reply previews still make sense.
//   • reactions — simple emoji counter map (e.g. { "👍": 3, "❤️": 1 }).
//   • Indexed on (community, createdAt) for efficient paginated history fetches.
// ─────────────────────────────────────────────────────────────────────────────
const communityMessageSchema = new mongoose.Schema(
  {
    // ── Which group ───────────────────────────────────────────────────────────
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: [true, "Community reference is required"],
      index: true,
    },

    // ── Who sent it ───────────────────────────────────────────────────────────
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender reference is required"],
    },

    // Snapshot so messages are readable even if user is deleted
    senderName: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Message content (text + emoji only) ───────────────────────────────────
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    // ── Reply threading ───────────────────────────────────────────────────────
    replyTo: {
      // ObjectId of the parent message (null = top-level message)
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityMessage",
        default: null,
      },
      // Snapshot of the parent for quick rendering
      senderName: { type: String, default: "" },
      textPreview: { type: String, default: "" }, // first 80 chars of parent text
    },

    // ── Emoji reactions ───────────────────────────────────────────────────────
    // e.g. { "👍": ["userId1", "userId2"], "❤️": ["userId3"] }
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: {},
    },

    // ── Soft delete ───────────────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = send time
  }
);

// Paginated history: most recent first for a given community
communityMessageSchema.index({ community: 1, createdAt: -1 });

// Fast lookup of all replies to a specific message
communityMessageSchema.index({ "replyTo.messageId": 1 });

module.exports = mongoose.model("CommunityMessage", communityMessageSchema);

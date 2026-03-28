/**
 * src/socket/chatHandler.js
 *
 * Socket.IO real-time chat for Community groups.
 *
 * ── Authentication ─────────────────────────────────────────────────────────────
 * Every socket.io connection MUST present a valid JWT in the handshake:
 *   { auth: { token: "<accessToken>" } }
 * The middleware verifies it and attaches req.user to socket.user.
 *
 * ── Room naming convention ─────────────────────────────────────────────────────
 * Each community maps to a Socket.IO room: "community:<communityId>"
 *
 * ── Client events (emit FROM client) ──────────────────────────────────────────
 *   join_community   { communityId }           → join the room (members only)
 *   leave_community  { communityId }           → leave the room
 *   send_message     { communityId, text, replyTo?: { messageId } }
 *   delete_message   { communityId, messageId }
 *   react_message    { communityId, messageId, emoji }  → toggle reaction
 *   typing           { communityId }           → "user is typing" broadcast
 *   stop_typing      { communityId }           → stop typing broadcast
 *
 * ── Server events (emit TO client) ────────────────────────────────────────────
 *   new_message      MessageDocument           → broadcast to room on new msg
 *   message_deleted  { messageId, communityId }
 *   reaction_updated { messageId, communityId, reactions }
 *   user_typing      { communityId, userId, userName }
 *   user_stop_typing { communityId, userId }
 *   error            { message }               → emitted only to sender
 */

const jwt = require("jsonwebtoken");
const Community = require("../models/Community");
const CommunityMessage = require("../models/CommunityMessage");
const User = require("../models/User");

// ─── JWT socket auth middleware ───────────────────────────────────────────────
function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    const user = JSON.parse(socket.handshake.auth?.user);
    if (!token) return next(new Error("Authentication token missing."));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user id + name to socket for use inside handlers
    socket.userId = decoded.id || decoded._id;
    socket.userName = user.fullName || "User";
    next();
  } catch {
    next(new Error("Invalid or expired token."));
  }
}

// ─── Helper: verify the socket's user is a member of a community ──────────────
async function assertMembership(communityId, userId) {
  const community =
    await Community.findById(communityId).select("members isOpen");
  if (!community) throw new Error("Community not found.");
  const joined = community.members.some(
    (m) => m.user.toString() === userId.toString(),
  );
  if (!joined)
    throw new Error("You must join this community to send messages.");
  return community;
}

// ─── Main handler — called once per Socket.IO server instance ─────────────────
function registerChatHandlers(io) {
  // Apply JWT auth to every new connection
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId})`);

    // ── join_community ──────────────────────────────────────────────────────
    socket.on("join_community", async ({ communityId } = {}) => {
      try {
        if (!communityId)
          return socket.emit("error", { message: "communityId is required." });

        await assertMembership(communityId, socket.userId);

        const room = `community:${communityId}`;
        socket.join(room);

        console.log(`👥 User ${socket.userId} joined room ${room}`);

        // ACK to sender only
        socket.emit("joined_community", { communityId, room });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ── leave_community ─────────────────────────────────────────────────────
    socket.on("leave_community", ({ communityId } = {}) => {
      if (!communityId) return;
      const room = `community:${communityId}`;
      socket.leave(room);
      socket.emit("left_community", { communityId });
    });

    // ── send_message ────────────────────────────────────────────────────────
    socket.on("send_message", async ({ communityId, text, replyTo } = {}) => {
      try {
        // Validate
        if (!communityId || !text?.trim()) {
          return socket.emit("error", {
            message: "communityId and text are required.",
          });
        }
        if (text.trim().length > 2000) {
          return socket.emit("error", {
            message: "Message too long (max 2000 chars).",
          });
        }

        // Membership check
        await assertMembership(communityId, socket.userId);

        // Fetch sender name (use cached socket.userName, refresh if empty)
        let senderName = socket.userName;

        if (!senderName) {
          const user = await User.findById(socket.userId).select("fullName");

          senderName = user?.fullName || "User";
          socket.userName = senderName;
        }

        // Build replyTo snapshot if replying to a parent message
        let replyToData = { messageId: null, senderName: "", textPreview: "" };
        if (replyTo?.messageId) {
          const parent = await CommunityMessage.findById(replyTo.messageId)
            .select("text senderName isDeleted")
            .lean();
          if (parent && !parent.isDeleted) {
            replyToData = {
              messageId: parent._id,
              senderName: parent.senderName,
              textPreview: parent.text.slice(0, 80), // first 80 chars as preview
            };
          }
        }

        // Persist to DB
        const message = await CommunityMessage.create({
          community: communityId,
          sender: socket.userId,
          senderName,
          text: text.trim(),
          replyTo: replyToData,
        });

        // Populate sender for the broadcast payload
        const populated = await CommunityMessage.findById(message._id)
          .populate("sender", "fullName avatar")
          .lean();

        // Broadcast to ALL sockets in the room (including sender)
        io.to(`community:${communityId}`).emit("new_message", populated);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ── delete_message ──────────────────────────────────────────────────────
    socket.on("delete_message", async ({ communityId, messageId } = {}) => {
      try {
        if (!communityId || !messageId) {
          return socket.emit("error", {
            message: "communityId and messageId are required.",
          });
        }

        const message = await CommunityMessage.findOne({
          _id: messageId,
          community: communityId,
        });

        if (!message)
          return socket.emit("error", { message: "Message not found." });

        // Only sender can delete their own message
        if (message.sender.toString() !== socket.userId.toString()) {
          return socket.emit("error", {
            message: "Not authorised to delete this message.",
          });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.text = "This message was deleted.";
        await message.save();

        // Notify all room members
        io.to(`community:${communityId}`).emit("message_deleted", {
          messageId,
          communityId,
        });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ── react_message ────────────────────────────────────────────────────────
    // Toggle an emoji reaction. If user already reacted with same emoji, remove it.
    socket.on(
      "react_message",
      async ({ communityId, messageId, emoji } = {}) => {
        try {
          if (!communityId || !messageId || !emoji) {
            return socket.emit("error", {
              message: "communityId, messageId and emoji are required.",
            });
          }

          // Basic emoji validation — reject non-emoji / too-long strings
          if (emoji.length > 8) {
            return socket.emit("error", { message: "Invalid emoji." });
          }

          await assertMembership(communityId, socket.userId);

          const message = await CommunityMessage.findById(messageId);
          if (!message || message.isDeleted) {
            return socket.emit("error", { message: "Message not found." });
          }

          const userId = socket.userId.toString();
          const reactors = message.reactions.get(emoji) || [];
          const alreadyReacted = reactors.map(String).includes(userId);

          if (alreadyReacted) {
            // Toggle off
            message.reactions.set(
              emoji,
              reactors.filter((id) => id.toString() !== userId),
            );
          } else {
            message.reactions.set(emoji, [...reactors, socket.userId]);
          }

          await message.save();

          // Convert Map to plain object for JSON serialization
          const reactionsObj = {};
          message.reactions.forEach((users, emojiKey) => {
            reactionsObj[emojiKey] = users.map(String);
          });

          io.to(`community:${communityId}`).emit("reaction_updated", {
            messageId,
            communityId,
            reactions: reactionsObj,
          });
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      },
    );

    // ── typing indicators ────────────────────────────────────────────────────
    socket.on("typing", ({ communityId } = {}) => {
      if (!communityId) return;
      socket.to(`community:${communityId}`).emit("user_typing", {
        communityId,
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    socket.on("stop_typing", ({ communityId } = {}) => {
      if (!communityId) return;
      socket.to(`community:${communityId}`).emit("user_stop_typing", {
        communityId,
        userId: socket.userId,
      });
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });
}

module.exports = { registerChatHandlers };

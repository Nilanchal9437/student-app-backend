const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createCommunity,
  listCommunities,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  getMessages,
  deleteMessage,
} = require("../controllers/communityController");

router.use(protect); // all community routes require login

// ── Group management ───────────────────────────────────────────────────────────
router.get("/", listCommunities);                             // GET  /api/communities
router.post("/", createCommunity);                            // POST /api/communities
router.get("/:id", getCommunity);                             // GET  /api/communities/:id
router.post("/:id/join", joinCommunity);                      // POST /api/communities/:id/join
router.post("/:id/leave", leaveCommunity);                    // POST /api/communities/:id/leave

// ── REST message history (read-only; writes go through Socket.IO) ─────────────
router.get("/:id/messages", getMessages);                     // GET  /api/communities/:id/messages
router.delete(
  "/:communityId/messages/:messageId",
  deleteMessage
);                                                            // DELETE /api/communities/:cId/messages/:mId

module.exports = router;

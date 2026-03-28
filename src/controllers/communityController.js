const Community = require("../models/Community");
const CommunityMessage = require("../models/CommunityMessage");
const Exam = require("../models/Exam");

// ─── Helper: check membership ─────────────────────────────────────────────────
function isMember(community, userId) {
  return community.members.some((m) => m.user.toString() === userId.toString());
}

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/communities
// @desc    Create a community group linked to an exam
// @body    { examId, name, description? }
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const createCommunity = async (req, res, next) => {
  try {
    const { examId, name, description } = req.body;

    if (!examId || !name) {
      return res.status(400).json({ success: false, message: "examId and name are required." });
    }

    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json({ success: false, message: "Exam not found." });
    }

    // Check no duplicate community per exam with same name
    const existing = await Community.findOne({ exam: examId, name: name.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A community with this name already exists for that exam.",
      });
    }

    const community = await Community.create({
      exam: examId,
      examName: exam.name,
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: req.user._id,
      // Creator is automatically added as the first member
      members: [{ user: req.user._id, joinedAt: new Date() }],
    });

    const populated = await community.populate("createdBy", "fullName avatar");

    res.status(201).json({
      success: true,
      message: "Community created successfully.",
      data: { community: populated },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/communities
// @desc    List communities (optionally filter by examId)
// @query   ?examId=<id>&page=1&limit=20
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const listCommunities = async (req, res, next) => {
  try {
    const { examId } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (examId) filter.exam = examId;

    const [communities, total] = await Promise.all([
      Community.find(filter)
        .populate("exam", "name level")
        .populate("createdBy", "fullName avatar")
        .select("-members") // don't return full members array in list
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Community.countDocuments(filter),
    ]);

    // Add memberCount and isMember flag for current user
    const userId = req.user._id.toString();
    const enriched = await Promise.all(
      communities.map(async (c) => {
        const full = await Community.findById(c._id).select("members").lean();
        return {
          ...c,
          memberCount: full.members.length,
          isMember: full.members.some((m) => m.user.toString() === userId),
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Communities fetched successfully.",
      data: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        communities: enriched,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/communities/:id
// @desc    Get one community detail + membership status
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate("exam", "name level isPremium")
      .populate("createdBy", "fullName avatar")
      .populate("members.user", "fullName avatar");

    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    res.status(200).json({
      success: true,
      data: {
        community,
        isMember: isMember(community, req.user._id),
        memberCount: community.members.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/communities/:id/join
// @desc    Join a community group
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const joinCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    if (!community.isOpen) {
      return res.status(403).json({ success: false, message: "This community is closed." });
    }

    if (isMember(community, req.user._id)) {
      return res.status(409).json({ success: false, message: "You are already a member." });
    }

    if (community.members.length >= community.maxMembers) {
      return res.status(403).json({ success: false, message: "Community is full." });
    }

    community.members.push({ user: req.user._id, joinedAt: new Date() });
    await community.save();

    res.status(200).json({
      success: true,
      message: "Joined community successfully.",
      data: { memberCount: community.members.length },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/communities/:id/leave
// @desc    Leave a community group
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const leaveCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    if (!isMember(community, req.user._id)) {
      return res.status(400).json({ success: false, message: "You are not a member." });
    }

    community.members = community.members.filter(
      (m) => m.user.toString() !== req.user._id.toString()
    );
    await community.save();

    res.status(200).json({
      success: true,
      message: "Left community successfully.",
      data: { memberCount: community.members.length },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/communities/:id/messages
// @desc    Fetch paginated message history for a community
//          Only accessible by members.
// @query   ?page=1&limit=30
// @access  Private (members only)
// ─────────────────────────────────────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id).select("members");
    if (!community) {
      return res.status(404).json({ success: false, message: "Community not found." });
    }

    if (!isMember(community, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You must join this community to view messages.",
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      CommunityMessage.find({ community: req.params.id, isDeleted: false })
        .sort({ createdAt: -1 }) // newest first — client reverses for display
        .skip(skip)
        .limit(limit)
        .populate("sender", "fullName avatar")
        .lean(),
      CommunityMessage.countDocuments({ community: req.params.id, isDeleted: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        messages: messages.reverse(), // oldest first for rendering
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/communities/:communityId/messages/:messageId
// @desc    Soft-delete a message (own messages only, or admin)
// @access  Private (member)
// ─────────────────────────────────────────────────────────────────────────────
const deleteMessage = async (req, res, next) => {
  try {
    const { communityId, messageId } = req.params;

    const message = await CommunityMessage.findOne({
      _id: messageId,
      community: communityId,
    });

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    const isOwner = message.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorised to delete this message." });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = "This message was deleted.";
    await message.save();

    res.status(200).json({ success: true, message: "Message deleted." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCommunity,
  listCommunities,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  getMessages,
  deleteMessage,
};

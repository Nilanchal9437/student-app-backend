const Reference = require("../models/Reference");
const User = require("../models/User");

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/references
// @desc    Create a new reference for another student
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const createReference = async (req, res, next) => {
  try {
    const { refereeId, relationship, description, rating } = req.body;
    const referrerId = req.user._id;

    // Validate inputs
    if (!refereeId) {
      return res.status(400).json({
        success: false,
        message: "Referee ID is required",
      });
    }

    if (!relationship) {
      return res.status(400).json({
        success: false,
        message: "Relationship type is required",
      });
    }

    // Prevent self-referencing
    if (referrerId.toString() === refereeId) {
      return res.status(400).json({
        success: false,
        message: "You cannot create a reference for yourself",
      });
    }

    // Check if referee exists
    const referee = await User.findById(refereeId);
    if (!referee) {
      return res.status(404).json({
        success: false,
        message: "The student you are trying to reference does not exist",
      });
    }

    // Check if reference already exists (prevent duplicates)
    const existingReference = await Reference.findOne({
      referrer: referrerId,
      referee: refereeId,
    });

    if (existingReference) {
      return res.status(409).json({
        success: false,
        message: "You have already created a reference for this student",
      });
    }

    // Create the reference
    const reference = await Reference.create({
      referrer: referrerId,
      referee: refereeId,
      relationship,
      description: description || "",
      rating: rating || 5,
    });

    // Populate referee data for response
    const populatedReference = await reference.populate([
      { path: "referrer", select: "fullName email className" },
      { path: "referee", select: "fullName email className" },
    ]);

    res.status(201).json({
      success: true,
      message: "Reference created successfully",
      data: populatedReference,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/references/received
// @desc    Get all references received by the current user
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const getReceivedReferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, relationship } = req.query;

    const skip = (page - 1) * limit;
    const pageLimit = parseInt(limit);

    let query = { referee: userId, isActive: true };

    // Filter by relationship if provided
    if (relationship) {
      query.relationship = relationship;
    }

    const references = await Reference.find(query)
      .populate("referrer", "fullName email className")
      .populate("referee", "fullName email className")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Reference.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "References retrieved successfully",
      data: {
        count: references.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / pageLimit),
        references,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/references/given
// @desc    Get all references given by the current user
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const getGivenReferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, relationship } = req.query;

    const skip = (page - 1) * limit;
    const pageLimit = parseInt(limit);

    let query = { referrer: userId, isActive: true };

    // Filter by relationship if provided
    if (relationship) {
      query.relationship = relationship;
    }

    const references = await Reference.find(query)
      .populate("referrer", "fullName email className")
      .populate("referee", "fullName email className")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Reference.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "References retrieved successfully",
      data: {
        count: references.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / pageLimit),
        references,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/references/user/:userId
// @desc    Get all public references for a specific user
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const getReferencesForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const pageLimit = parseInt(limit);

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const references = await Reference.find({
      referee: userId,
      isActive: true,
    })
      .populate("referrer", "fullName email className")
      .populate("referee", "fullName email className")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    const total = await Reference.countDocuments({
      referee: userId,
      isActive: true,
    });

    // Calculate average rating
    const stats = await Reference.aggregate([
      { $match: { referee: mongoose.Types.ObjectId(userId), isActive: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReferences: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "References retrieved successfully",
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          className: user.className,
        },
        count: references.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / pageLimit),
        stats: stats[0] || { averageRating: 0, totalReferences: 0 },
        references,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/references/:referenceId
// @desc    Update a reference (only by referrer)
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const updateReference = async (req, res, next) => {
  try {
    const { referenceId } = req.params;
    const { description, rating, relationship } = req.body;
    const userId = req.user._id;

    const reference = await Reference.findById(referenceId);

    if (!reference) {
      return res.status(404).json({
        success: false,
        message: "Reference not found",
      });
    }

    // Only the referrer can update the reference
    if (reference.referrer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update references you have created",
      });
    }

    // Update fields
    if (description !== undefined) {
      reference.description = description;
    }
    if (rating !== undefined) {
      reference.rating = rating;
    }
    if (relationship !== undefined) {
      reference.relationship = relationship;
    }

    await reference.save();

    const updatedReference = await reference.populate([
      { path: "referrer", select: "fullName email className" },
      { path: "referee", select: "fullName email className" },
    ]);

    res.status(200).json({
      success: true,
      message: "Reference updated successfully",
      data: updatedReference,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/references/:referenceId
// @desc    Delete a reference (soft delete only the referrer can delete)
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const deleteReference = async (req, res, next) => {
  try {
    const { referenceId } = req.params;
    const userId = req.user._id;

    const reference = await Reference.findById(referenceId);

    if (!reference) {
      return res.status(404).json({
        success: false,
        message: "Reference not found",
      });
    }

    // Only the referrer can delete the reference
    if (reference.referrer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete references you have created",
      });
    }

    // Soft delete
    reference.isActive = false;
    await reference.save();

    res.status(200).json({
      success: true,
      message: "Reference deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReference,
  getReceivedReferences,
  getGivenReferences,
  getReferencesForUser,
  updateReference,
  deleteReference,
};

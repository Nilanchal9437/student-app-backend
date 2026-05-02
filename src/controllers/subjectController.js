const Subject = require("../models/Subject");
const Term = require("../models/Term");

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/subjects?term=<termId>
// @desc    Get all subjects for a specific term
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getSubjectsByTerm = async (req, res, next) => {
  try {
    const { term } = req.query;

    if (!term) {
      return res.status(400).json({
        success: false,
        message: "term query parameter is required.",
      });
    }

    // Ensure term exists
    const termDoc = await Term.findById(term);
    if (!termDoc) {
      return res.status(404).json({ success: false, message: "Term not found." });
    }

    const subjects = await Subject.find({ term })
      .sort({ subjectName: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      message: "Subjects fetched successfully.",
      data: { count: subjects.length, subjects },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/subjects/:id
// @desc    Get a single subject by ID
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate({
      path: "term",
      select: "name exam",
      populate: { path: "exam", select: "name level isPremium" },
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    res.status(200).json({
      success: true,
      message: "Subject fetched successfully.",
      data: { subject },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const createSubject = async (req, res, next) => {
  try {
    const { term, subjectName } = req.body;

    if (!term || !subjectName) {
      return res.status(400).json({
        success: false,
        message: "term and subjectName are required.",
      });
    }

    const termDoc = await Term.findById(term);
    if (!termDoc) {
      return res.status(404).json({ success: false, message: "Term not found." });
    }

    const subject = await Subject.create({ term, subjectName });

    res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      data: { subject },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/subjects/:id
// @desc    Delete a subject
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    res.status(200).json({ success: true, message: "Subject deleted successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSubjectsByTerm, getSubjectById, createSubject, deleteSubject };

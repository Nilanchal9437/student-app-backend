const Term = require("../models/Term");
const Exam = require("../models/Exam");

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/terms?exam=<examId>
// @desc    Get all terms for a specific exam
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getTermsByExam = async (req, res, next) => {
  try {
    const { exam } = req.query;

    if (!exam) {
      return res.status(400).json({
        success: false,
        message: "exam query parameter is required.",
      });
    }

    // Ensure exam exists
    const examDoc = await Exam.findById(exam);
    if (!examDoc) {
      return res.status(404).json({ success: false, message: "Exam not found." });
    }

    const terms = await Term.find({ exam })
      .sort({ createdAt: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      message: "Terms fetched successfully.",
      data: { count: terms.length, terms },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/terms/:id
// @desc    Get a single term by ID
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getTermById = async (req, res, next) => {
  try {
    const term = await Term.findById(req.params.id).populate("exam", "name level isPremium");

    if (!term) {
      return res.status(404).json({ success: false, message: "Term not found." });
    }

    res.status(200).json({
      success: true,
      message: "Term fetched successfully.",
      data: { term },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/terms
// @desc    Create a new term
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const createTerm = async (req, res, next) => {
  try {
    const { exam, name } = req.body;

    if (!exam || !name) {
      return res.status(400).json({
        success: false,
        message: "exam and name are required.",
      });
    }

    const examDoc = await Exam.findById(exam);
    if (!examDoc) {
      return res.status(404).json({ success: false, message: "Exam not found." });
    }

    const term = await Term.create({ exam, name });

    res.status(201).json({
      success: true,
      message: "Term created successfully.",
      data: { term },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/terms/:id
// @desc    Delete a term
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteTerm = async (req, res, next) => {
  try {
    const term = await Term.findByIdAndDelete(req.params.id);

    if (!term) {
      return res.status(404).json({ success: false, message: "Term not found." });
    }

    res.status(200).json({ success: true, message: "Term deleted successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTermsByExam, getTermById, createTerm, deleteTerm };

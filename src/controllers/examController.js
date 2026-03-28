const Exam = require("../models/Exam");

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/exams
// @desc    Create a new exam
// @access  Private (admin only — protect + restrictTo("admin"))
// ─────────────────────────────────────────────────────────────────────────────
const createExam = async (req, res, next) => {
  try {
    const { name, level, isPremium } = req.body;

    if (!name || !level) {
      return res.status(400).json({
        success: false,
        message: "Exam name and level are required.",
      });
    }

    const exam = await Exam.create({ name, level, isPremium: !!isPremium });

    res.status(201).json({
      success: true,
      message: "Exam created successfully.",
      data: { exam },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/exams
// @desc    Get all active exams (optionally filter by level / isPremium)
// @query   level, isPremium, search
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getAllExams = async (req, res, next) => {
  try {
    const filter = { isActive: true };

    if (req.query.level) filter.level = req.query.level;
    if (req.query.isPremium !== undefined)
      filter.isPremium = req.query.isPremium === "true";
    if (req.query.search) filter.$text = { $search: req.query.search };

    const exams = await Exam.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Exams fetched successfully.",
      data: { count: exams.length, exams },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/exams/:id
// @desc    Get a single exam by ID
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Exam fetched successfully.",
      data: { exam },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/exams/:id
// @desc    Update exam details
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const updateExam = async (req, res, next) => {
  try {
    const allowed = ["name", "level", "isPremium", "isActive"];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found." });
    }

    res.status(200).json({
      success: true,
      message: "Exam updated successfully.",
      data: { exam },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/exams/:id
// @desc    Soft-delete an exam (sets isActive = false)
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found." });
    }

    res.status(200).json({
      success: true,
      message: "Exam deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createExam, getAllExams, getExamById, updateExam, deleteExam };

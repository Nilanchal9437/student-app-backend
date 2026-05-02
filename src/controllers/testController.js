const Test = require("../models/Test");
const Subject = require("../models/Subject");

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/tests?subject=<subjectId>
// @desc    Get all questions for a specific subject
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getQuestionsBySubject = async (req, res, next) => {
  try {
    const { subject } = req.query;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "subject query parameter is required.",
      });
    }

    const questions = await Test.find({ subject, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      message: "Questions fetched successfully.",
      data: { count: questions.length, questions },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/tests/:id
// @desc    Get a single question by ID
// @access  Private (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
const getQuestionById = async (req, res, next) => {
  try {
    const q = await Test.findById(req.params.id)
      .populate("exam", "name level")
      .populate("term", "name")
      .populate("subject", "subjectName");

    if (!q || !q.isActive) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    res.status(200).json({
      success: true,
      message: "Question fetched successfully.",
      data: { question: q },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/tests
// @desc    Add a question to a subject
// @body    { exam, term, subject, question, options:{A,B,C,D}, answer, explanation?, marks?, order? }
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const createQuestion = async (req, res, next) => {
  try {
    const { exam, term, subject, question, options, answer, explanation, marks, order } = req.body;

    if (!exam || !term || !subject || !question || !options || !answer) {
      return res.status(400).json({
        success: false,
        message: "exam, term, subject, question, options (A-D) and answer are required.",
      });
    }

    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    const testDoc = await Test.create({
      exam,
      term,
      subject,
      question,
      options,
      answer,
      explanation: explanation ?? "",
      marks: marks ?? 1,
      order: order ?? 0,
    });

    res.status(201).json({
      success: true,
      message: "Question added successfully.",
      data: { question: testDoc },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/tests/bulk
// @desc    Add multiple questions in one request
// @body    { exam, term, subject, questions: [ { question, options, answer, ... } ] }
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { exam, term, subject, questions } = req.body;

    if (!exam || !term || !subject || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "exam, term, subject and a non-empty questions array are required.",
      });
    }

    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    const docs = questions.map((q, idx) => ({
      exam,
      term,
      subject,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation ?? "",
      marks: q.marks ?? 1,
      order: q.order ?? idx,
    }));

    const inserted = await Test.insertMany(docs, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${inserted.length} question(s) added successfully.`,
      data: { count: inserted.length, questions: inserted },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/tests/:id
// @desc    Update a question
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const updateQuestion = async (req, res, next) => {
  try {
    const allowed = ["question", "options", "answer", "explanation", "marks", "order", "isActive"];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const q = await Test.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!q) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    res.status(200).json({
      success: true,
      message: "Question updated successfully.",
      data: { question: q },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   DELETE /api/tests/:id
// @desc    Soft-delete a question
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteQuestion = async (req, res, next) => {
  try {
    const q = await Test.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!q) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    res.status(200).json({ success: true, message: "Question deleted successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createQuestion,
  bulkCreateQuestions,
  getQuestionsBySubject,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};

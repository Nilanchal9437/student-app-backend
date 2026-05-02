const Result = require("../models/Result");
const TestResult = require("../models/TestResult");
const Test = require("../models/Test");
const Exam = require("../models/Exam");
const Term = require("../models/Term");
const Subject = require("../models/Subject");

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/results/submit
// @desc    Submit an exam attempt
//
// Flow:
//   1. Validate request body
//   2. Fetch exam document (for name snapshot)
//   3. Fetch all attempted question documents in one DB call
//   4. Create the Result header document (summary only)
//   5. Bulk-insert one TestResult document per question
//   6. Update Result summary counters (totalScore, percentage)
//
// @body    {
//            examId   : string,
//            duration : number (total seconds),
//            answers  : [{ questionId, selectedAnswer, duration }]
//          }
// @access  Private (student only)
// ─────────────────────────────────────────────────────────────────────────────
const submitResult = async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can submit exam results.",
      });
    }

    const { subjectId, duration, answers } = req.body;

    if (!subjectId || !Array.isArray(answers) || answers.length === 0 || duration == null) {
      return res.status(400).json({
        success: false,
        message: "subjectId, duration, and a non-empty answers array are required.",
      });
    }

    // ── Resolve exam via Subject → Term → Exam ────────────────────────────────
    const subjectDoc = await Subject.findById(subjectId);
    if (!subjectDoc) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    const termDoc = await Term.findById(subjectDoc.term);
    if (!termDoc) {
      return res.status(404).json({ success: false, message: "Term not found." });
    }

    const exam = await Exam.findById(termDoc.exam);
    if (!exam || !exam.isActive) {
      return res.status(404).json({ success: false, message: "Exam not found." });
    }

    // ── Fetch all question documents ──────────────────────────────────────────
    const questionIds = answers.map((a) => a.questionId);
    const questions = await Test.find({ _id: { $in: questionIds }, isActive: true });

    const questionMap = {};
    questions.forEach((q) => { questionMap[q._id.toString()] = q; });

    // ── Create the Result header ──────────────────────────────────────────────
    const result = await Result.create({
      user: req.user._id,
      exam: exam._id,
      term: termDoc._id,
      subject: subjectDoc._id,
      examName: `${exam.name} — ${termDoc.name} — ${subjectDoc.subjectName}`,
      duration,
      totalQuestions: answers.length,
    });

    // ── Build and bulk-insert TestResult documents ────────────────────────────
    let totalScore = 0;
    const testResultDocs = answers.map((a, idx) => {
      const qDoc = questionMap[a.questionId?.toString()];
      if (!qDoc) return null;

      const isCorrect = a.selectedAnswer === qDoc.answer;
      const point = isCorrect ? 1 : 0;
      totalScore += point;

      return {
        result: result._id,
        question: qDoc._id,
        questionText: qDoc.question,
        options: { A: qDoc.options.A, B: qDoc.options.B, C: qDoc.options.C, D: qDoc.options.D },
        answered: a.selectedAnswer ?? null,
        correctAnswer: qDoc.answer,
        scorePoint: point,
        duration: a.duration ?? 0,
        order: qDoc.order ?? idx,
      };
    }).filter(Boolean);

    if (testResultDocs.length > 0) {
      await TestResult.insertMany(testResultDocs, { ordered: false });
    }

    // ── Update Result summary ─────────────────────────────────────────────────
    const percentage = testResultDocs.length > 0
      ? Math.round((totalScore / testResultDocs.length) * 100)
      : 0;

    await Result.findByIdAndUpdate(result._id, {
      totalScore,
      totalQuestions: testResultDocs.length,
      percentage,
    });

    res.status(201).json({
      success: true,
      message: "Exam submitted successfully!",
      data: {
        result: {
          id: result._id,
          examName: result.examName,
          totalQuestions: testResultDocs.length,
          totalScore,
          percentage,
          duration,
          submittedAt: result.submittedAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/results/my
// @desc    Get all result summaries for the logged-in student
// @access  Private (student)
// ─────────────────────────────────────────────────────────────────────────────
const getMyResults = async (req, res, next) => {
  try {
    const results = await Result.find({ user: req.user._id })
      .populate("exam", "name level isPremium")
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      message: "Results fetched successfully.",
      data: { count: results.length, results },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/results/my/:resultId
// @desc    Get the summary of one result (ownership check)
// @access  Private (student — own only)
// ─────────────────────────────────────────────────────────────────────────────
const getResultDetail = async (req, res, next) => {
  try {
    const result = await Result.findOne({
      _id: req.params.resultId,
      user: req.user._id,
    }).populate("exam", "name level isPremium");

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    res.status(200).json({
      success: true,
      message: "Result fetched successfully.",
      data: { result },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/results/my/:resultId/questions
// @desc    Get all per-question TestResult documents for one attempt
//          Paginated: ?page=1&limit=20
// @access  Private (student — own only)
// ─────────────────────────────────────────────────────────────────────────────
const getResultQuestions = async (req, res, next) => {
  try {
    // Ownership: confirm the result belongs to this student
    const result = await Result.findOne({
      _id: req.params.resultId,
      user: req.user._id,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [testResults, total] = await Promise.all([
      TestResult.find({ result: req.params.resultId })
        .sort({ order: 1 })
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      TestResult.countDocuments({ result: req.params.resultId }),
    ]);

    res.status(200).json({
      success: true,
      message: "Question results fetched successfully.",
      data: {
        resultId: result._id,
        examName: result.examName,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        questions: testResults,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/results/exam/:examId
// @desc    All result summaries for an exam (admin — leaderboard view)
// @access  Private (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const getResultsByExam = async (req, res, next) => {
  try {
    const results = await Result.find({ exam: req.params.examId })
      .populate("user", "fullName email className")
      .sort({ totalScore: -1, submittedAt: -1 });

    res.status(200).json({
      success: true,
      message: "Exam results fetched successfully.",
      data: { count: results.length, results },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitResult,
  getMyResults,
  getResultDetail,
  getResultQuestions,
  getResultsByExam,
};

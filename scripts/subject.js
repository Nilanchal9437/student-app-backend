/**
 * scripts/seed-subjects.js
 * Run: node scripts/seed-subjects.js
 */

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const mongoose = require("mongoose");

const Exam = require("../src/models/Exam");
const Term = require("../src/models/Term");
const Subject = require("../src/models/Subject");

// ─── CONNECT ──────────────────────────────────────────────────────────────────
async function connect() {
  const raw = process.env.MONGODB_URI;
  if (!raw) throw new Error("MONGODB_URI not set");

  const url = new URL(raw);
  if (!url.pathname || url.pathname === "/") {
    url.pathname = "/student-exam-app";
  }

  await mongoose.connect(url.toString());
  console.log("✅ MongoDB connected");
}

// ─── SUBJECTS PER CLASS ───────────────────────────────────────────────────────
const SUBJECTS_BY_CLASS = {
  JSS1: ["English", "Mathematics", "Basic Science", "Social Studies"],
  JSS2: ["English", "Mathematics", "Basic Science", "Social Studies"],
  JSS3: ["English", "Mathematics", "Basic Science", "Social Studies"],

  SSS1: ["English", "Mathematics", "Physics", "Chemistry", "Biology"],
  SSS2: ["English", "Mathematics", "Physics", "Chemistry", "Biology"],
  SSS3: ["English", "Mathematics", "Physics", "Chemistry", "Biology"],
};

// ─── SEED ─────────────────────────────────────────────────────────────────────
async function seed() {
  await connect();

  console.log("🗑 Clearing old subjects...");
  await Subject.deleteMany({});

  const exams = await Exam.find({});
  console.log(`📘 Found ${exams.length} exams`);

  const allSubjects = [];

  for (const exam of exams) {
    const subjects = SUBJECTS_BY_CLASS[exam.name];

    if (!subjects) {
      console.warn(`⚠ No subject config for ${exam.name}`);
      continue;
    }

    // get terms for this exam
    const terms = await Term.find({ exam: exam._id });

    if (!terms.length) {
      console.warn(`⚠ No terms found for ${exam.name}`);
      continue;
    }

    for (const term of terms) {
      for (const subjectName of subjects) {
        allSubjects.push({
          term: term._id,
          subjectName,
        });
      }
    }
  }

  console.log(`📝 Inserting ${allSubjects.length} subjects...`);

  const inserted = await Subject.insertMany(allSubjects, {
    ordered: false,
  });

  console.log(`✅ ${inserted.length} subjects inserted`);

  // ─── SUMMARY ────────────────────────────────────────────────────────────────
  const summary = await Subject.aggregate([
    {
      $group: {
        _id: "$term",
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "terms",
        localField: "_id",
        foreignField: "_id",
        as: "term",
      },
    },
    { $unwind: "$term" },
    {
      $project: {
        term: "$term.name",
        count: 1,
        _id: 0,
      },
    },
    { $sort: { term: 1 } },
  ]);

  console.log("\n─── Subjects per Term ───────────────────────────────");
  summary.forEach((s) => {
    console.log(`  ${s.term}: ${s.count} subjects`);
  });

  console.log("────────────────────────────────────────────────────");

  await mongoose.disconnect();
  console.log("\n🎉 Done!");
}

// ─── RUN ──────────────────────────────────────────────────────────────────────
seed().catch((err) => {
  console.error("❌ Error:", err.message);
  mongoose.disconnect();
  process.exit(1);
});

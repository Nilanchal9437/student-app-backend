/**
 * scripts/seedCommunities.js
 *
 * Run: node scripts/seedCommunities.js
 *
 * Creates one (or more) Community group per Exam in the database.
 * Also creates a system "admin" user to act as the group creator if no
 * existing admin user is found.
 *
 * Safe to run multiple times — uses upsert logic so it won't duplicate
 * communities that already exist for a given exam + name combo.
 *
 * ── What it creates ────────────────────────────────────────────────────────
 *   For every Exam document in the DB:
 *     • A primary "Discussion" group  (open, 500 members max)
 *     • A "Past Questions & Tips" group (open, 300 members max)
 *
 *   Groups are linked to the exam via ObjectId and carry an examName
 *   snapshot.  The system admin is automatically added as the first member.
 * ─────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const Exam      = require("../src/models/Exam");
const Community = require("../src/models/Community");
const User      = require("../src/models/User");

// ─── DB connection ─────────────────────────────────────────────────────────────
async function connect() {
  const raw = process.env.MONGODB_URI;
  if (!raw) throw new Error("MONGODB_URI is not set in .env");
  const url = new URL(raw);
  if (!url.pathname || url.pathname === "/") url.pathname = "/student-exam-app";
  await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 8000 });
  console.log("✅ Connected to MongoDB →", mongoose.connection.name);
}

// ─── Ensure a system admin user exists (used as community creator) ─────────────
async function getOrCreateSystemAdmin() {
  const ADMIN_EMAIL = "system.admin@examapp.internal";

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) {
    console.log("👤 System admin already exists →", admin._id.toString());
    return admin;
  }

  const hashed = await bcrypt.hash("Admin@123!", 10);
  admin = await User.create({
    fullName:  "System Admin",
    email:     ADMIN_EMAIL,
    password:  hashed,
    role:      "admin",
    isActive:  true,
  });
  console.log("👤 Created system admin →", admin._id.toString());
  return admin;
}

// ─── Community templates per exam ─────────────────────────────────────────────
// We generate two groups per exam.  You can extend this array with more.
function buildGroupTemplates(exam) {
  return [
    {
      name:        `${exam.name} — Discussion`,
      description: `General discussion group for ${exam.name}. Share tips, ask questions, and help each other prepare.`,
      maxMembers:  500,
      isOpen:      true,
    },
    {
      name:        `${exam.name} — Past Questions & Tips`,
      description: `Share past questions, answers, and exam strategies for ${exam.name}. Members only — join to participate.`,
      maxMembers:  300,
      isOpen:      true,
    },
  ];
}

// ─── Main seeder ───────────────────────────────────────────────────────────────
async function seedCommunities() {
  await connect();

  // ── 1. Get or create the system admin ──
  const admin = await getOrCreateSystemAdmin();

  // ── 2. Fetch all active exams ──
  const exams = await Exam.find({ isActive: { $ne: false } }).sort({ name: 1 });
  if (exams.length === 0) {
    console.warn("⚠  No exams found. Run scripts/seed.js first.");
    return;
  }
  console.log(`\n📚 Found ${exams.length} exams. Generating community groups...\n`);

  let created = 0;
  let skipped = 0;

  for (const exam of exams) {
    const templates = buildGroupTemplates(exam);

    for (const tmpl of templates) {
      // Upsert: only create if this (exam + name) combo doesn't exist yet
      const existing = await Community.findOne({
        exam: exam._id,
        name: tmpl.name,
      });

      if (existing) {
        console.log(`  ⏭  SKIP   "${tmpl.name}"`);
        skipped++;
        continue;
      }

      await Community.create({
        exam:        exam._id,
        examName:    exam.name,
        name:        tmpl.name,
        description: tmpl.description,
        createdBy:   admin._id,
        isOpen:      tmpl.isOpen,
        maxMembers:  tmpl.maxMembers,
        members: [
          { user: admin._id, joinedAt: new Date() },
        ],
      });

      console.log(`  ✅ CREATED "${tmpl.name}"`);
      created++;
    }
  }

  // ── 3. Summary ──
  const total = await Community.countDocuments();
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Created  : ${created} community groups
  ⏭  Skipped  : ${skipped} (already existed)
  📊  Total    : ${total} communities in DB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  await mongoose.disconnect();
}

seedCommunities().catch((err) => {
  console.error("❌ Community seeding failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});

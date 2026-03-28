const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// ─── User Schema ──────────────────────────────────────────────────────────────
// Fields mirror the Profile screen:
//   email, phone, className (Personal Info section)
//   password / passwordChange (Security section)
// Plus registration fields: fullName, role, subscription, etc.
const userSchema = new mongoose.Schema(
  {
    // ── Core Identity ──────────────────────────────────────────────────────────
    fullName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    // ── Security ───────────────────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never returned in queries by default
    },

    // ── Profile Section Fields (matches Profile screen) ────────────────────────
    phone: {
      type: String,
      trim: true,
      default: "",
      match: [/^[+\d\s\-()]{7,20}$/, "Please enter a valid phone number"],
    },

    className: {
      type: String, // e.g. "SS1", "SS2", "SS3", "JSS1" …
      trim: true,
      default: "",
    },

    // ── Account Metadata ───────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Password Reset (Forget Password flow) ──────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // ── Tracking ───────────────────────────────────────────────────────────────
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// ─── Pre-save hook — hash password ────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method — compare password ───────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance method — generate password reset token ─────────────────────────
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  // Store hashed version in DB
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken; // return raw token (sent via email)
};

// ─── Virtual — safe public profile ────────────────────────────────────────────
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    className: this.className,
    role: this.role,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("User", userSchema);

const crypto = require("crypto");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const { sendPasswordResetEmail } = require("../utils/email");

// ─── Helper — send token response ────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: user.toPublicJSON(),
      accessToken,
      refreshToken,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/users/register
// @desc    Register a new student account
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if email already taken
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      fullName: fullName?.trim() || "",
      email: email.toLowerCase().trim(),
      password,
    });

    sendTokenResponse(user, 201, res, "Account created successfully!");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/users/login
// @desc    Login with email + password
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Explicitly select +password since it's set to select: false
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res, "Logged in successfully!");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/users/forget-password
// @desc    Reset password directly using email — no email/token required
// @body    { email, newPassword, confirmPassword }
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const forgetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, new password, and confirm password are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Directly set the new password — the pre-save hook will hash it
    user.password = newPassword;
    // Clear any leftover reset token fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully! You can now log in with your new password.",
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/users/reset-password/:token  (deprecated — no longer used)
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  res.status(410).json({
    success: false,
    message:
      "This endpoint is no longer used. Use POST /api/users/forget-password instead.",
  });
};


// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/users/profile
// @desc    Get authenticated user's profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      data: {
        user: req.user.toPublicJSON(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/profile
// @desc    Update profile info (email, phone, className, fullName, avatar)
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ["fullName", "email", "phone", "className", "avatar"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : req.body[field];
      }
    });

    // Normalise email
    if (updates.email) {
      updates.email = updates.email.toLowerCase();

      // Check if new email is already taken by another user
      const emailInUse = await User.findOne({
        email: updates.email,
        _id: { $ne: req.user._id },
      });
      if (emailInUse) {
        return res.status(409).json({
          success: false,
          message: "This email is already in use by another account.",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      data: { user: updatedUser.toPublicJSON() },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/change-password
// @desc    Change password (requires current password verification)
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters.",
      });
    }

    // Fetch user with password (select: false by default)
    const user = await User.findById(req.user._id).select("+password");

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, "Password changed successfully!");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  forgetPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
};

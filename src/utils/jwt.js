const jwt = require("jsonwebtoken");

// ─── Generate access token ────────────────────────────────────────────────────
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, fullName: user.fullName, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

// ─── Generate refresh token ───────────────────────────────────────────────────
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, fullName: user.fullName, email: user.email },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },
  );
};

// ─── Verify access token ──────────────────────────────────────────────────────
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
};

const nodemailer = require("nodemailer");

// ─── Create reusable transporter ─────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ─── Send password reset email ────────────────────────────────────────────────
const sendPasswordResetEmail = async ({ to, resetToken, userName }) => {
  const transporter = createTransporter();

  // The reset link can be a deep link for the mobile app or a web URL
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "🔑 Reset Your Password — Student Exam App",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Password Reset</title>
        </head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#2452FF,#3B6FFF);padding:36px 32px;text-align:center;">
                      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Student Exam App</h1>
                      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Password Reset Request</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 32px;">
                      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
                        Hi <strong>${userName || "there"}</strong>,
                      </p>
                      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                        We received a request to reset your password. Click the button below to create a new password. This link expires in <strong>15 minutes</strong>.
                      </p>
                      <div style="text-align:center;margin:0 0 28px;">
                        <a href="${resetUrl}"
                           style="display:inline-block;background:#2452FF;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;">
                          Reset My Password
                        </a>
                      </div>
                      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
                        If you didn't request this, please ignore this email — your password won't change.
                      </p>
                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
                      <p style="color:#9ca3af;font-size:12px;margin:0;">
                        Or copy this link into your browser:<br />
                        <span style="color:#2452FF;word-break:break-all;">${resetUrl}</span>
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f9fafb;padding:20px 32px;text-align:center;">
                      <p style="color:#9ca3af;font-size:12px;margin:0;">
                        © ${new Date().getFullYear()} Student Exam App. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };

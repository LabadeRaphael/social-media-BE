// src/utils/mailer.ts
import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,   // e.g. "smtp.gmail.com"
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendResetPasswordEmail = (to: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Nestfinity Support" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <div style="background-color: #1a1a1a; padding: 20px; font-family: Arial, sans-serif; color: #fdf8f4;">
        <h2 style="color: #fdf8f4;">Password Reset Request</h2>
        <p style="color: #fdf8f4;">You requested to reset your password.</p>
        <p style="color: #fdf8f4;">Click the button below to reset it:</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          background-color: #fdf8f4;
          color: #1a1a1a;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        ">
          Reset Password
        </a>
        <p style="margin-top: 20px; color: #fdf8f4;">This link will expire in 15 minutes.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export { sendResetPasswordEmail };

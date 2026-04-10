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
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Nestfinity Team" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <div style="background-color: #1a1a1a; padding: 20px; font-family: Arial, sans-serif; color: #fdf8f4;">
        <h2 style="color: #fdf8f4;">Password Reset Request</h2>
        <p style="color: #fdf8f4;">You requested to reset your password.</p>
        <p style="color: #fdf8f4;">Click the button below to reset it:</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          background-color: #ffc244;
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
const sendRecoverAccountEmail = (to: string, token: string) => {
  // const recoverUrl = `${process.env.FRONTEND_URL}/auth/recover-account?token=${token}`;
const recoverUrl = `${process.env.FRONTEND_URL}/auth/recover-account-verify?token=${token}`;
  const mailOptions = {
    from: `"Nestfinity Team" <${process.env.SMTP_USER}>`,
    to,
    subject: "Recover Your Nestfinity Account",
    html: `
      <div style="background-color: #1a1a1a; padding: 24px; font-family: Arial, sans-serif; color: #fdf8f4; border-radius: 8px;">
        
        <h2 style="color: #ffc244; margin-bottom: 12px;">
          Account Recovery Request
        </h2>

        <p style="color: #fdf8f4; font-size: 14px;">
          We received a request to restore your Nestfinity account.
        </p>

        <p style="color: #fdf8f4; font-size: 14px;">
          If this was you, click the button below to recover your account:
        </p>

        <a href="${recoverUrl}" style="
          display: inline-block;
          background-color: #ffc244;
          color: #1a1a1a;
          padding: 12px 22px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin-top: 10px;
        ">
          Recover Account
        </a>

        <p style="margin-top: 20px; font-size: 13px; color: #cccccc;">
          This link will expire in 15 minutes for your security.
        </p>

        <p style="font-size: 12px; color: #888;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendWarningRecoverAccount = (to: string, token: string) => {
  const recoverUrl = `${process.env.FRONTEND_URL}/auth/recover-account-verify?token=${token}`;

  const mailOptions = {
    from: `"Nestfinity Team" <${process.env.SMTP_USER}>`,
    to,
    subject: "⚠️ Final Warning: Account Deletion in 24 Hours",
    html: `
      <div style="background-color: #1a1a1a; padding: 24px; font-family: Arial, sans-serif; color: #fdf8f4; border-radius: 8px;">
        
        <h2 style="color: #ffc244; margin-bottom: 12px;">
          ⚠️ Final Warning
        </h2>

        <p style="color: #fdf8f4; font-size: 14px;">
          Your Nestfinity account will be permanently deleted in <b>24 hours</b>.
        </p>

        <p style="color: #fdf8f4; font-size: 14px;">
          If this was a mistake or you still want to keep your account, you can restore it now.
        </p>

        <p style="color: #fdf8f4; font-size: 14px;">
          Once deleted, all your data will be permanently removed and cannot be recovered.
        </p>

        <a href="${recoverUrl}" style="
          display: inline-block;
          background-color: #ffc244;
          color: #1a1a1a;
          padding: 12px 22px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin-top: 12px;
        ">
          Restore My Account
        </a>

        <p style="margin-top: 20px; font-size: 12px; color: #888;">
          This is your final reminder before permanent deletion.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export { sendResetPasswordEmail, sendRecoverAccountEmail, sendWarningRecoverAccount};

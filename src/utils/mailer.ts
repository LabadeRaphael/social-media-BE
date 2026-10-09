import { BrevoClient } from '@getbrevo/brevo';

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const senderName = process.env.BREVO_SENDER_NAME || 'Nestfinity Team';

if (!apiKey) {
  throw new Error('BREVO_API_KEY is not configured');
}

if (!senderEmail) {
  throw new Error('BREVO_SENDER_EMAIL is not configured');
}

const brevo = new BrevoClient({
  apiKey,
  timeoutInSeconds: 30,
  maxRetries: 2,
});

const sendEmail = (
  to: string,
  subject: string,
  html: string,
) => {
  return brevo.transactionalEmails.sendTransacEmail({
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  });
};

// Shared layout for consistent spacing and mobile-friendly email rendering.
const emailLayout = (content: string) => `

<div style="padding:20px 24px;background-color:#120802;border-bottom:1px solid #382f25;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="vertical-align:middle;padding-right:12px;">
        <img
          src="https://res.cloudinary.com/dvnc009fc/image/upload/fl_preserve_transparency/v1791584303/file-Nz8Ma4h5Djtg55mcPnQh7b.jpg"
          alt="Nestfinity logo"
          width="44"
          height="44"
          style="display:block;width:44px;height:44px;object-fit:cover;border-radius:50%;border:0;"
        />
      </td>
      <td style="vertical-align:middle;">
        <p style="margin:0;color:#ffc244;font-size:22px;font-weight:bold;letter-spacing:0.3px;">
          Nestfinity
        </p>
      </td>
    </tr>
  </table>
</div>


      <div style="padding: 28px 24px;background-color:#120802">
        ${content}
      </div>

      <div style="
        padding: 18px 24px;
        background-color: #151515;
        border-top: 1px solid #382f25;
      ">
        <p style="
          margin: 0;
          color: #aaa39c;
          font-size: 12px;
          line-height: 1.6;
        ">
          This is an automated security email from Nestfinity.
          Please do not reply directly to this message.
        </p>
      </div>
    </div>
  </div>
`;

const emailHeading = (text: string) => `
  <h2 style="
    margin: 0 0 16px;
    color: #ffc244;
    font-size: 22px;
    line-height: 1.35;
  ">
    ${text}
  </h2>
`;

const emailParagraph = (text: string) => `
  <p style="
    margin: 0 0 16px;
    color: #fdf8f4;
    font-size: 14px;
    line-height: 1.8;
  ">
    ${text}
  </p>
`;

const emailButton = (url: string, label: string) => `
  <div style="margin: 24px 0;">
    <a href="${url}" style="
      display: inline-block;
      background-color: #ffc244;
      color: #1a1a1a;
      padding: 12px 22px;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      line-height: 1.5;
    ">
      ${label}
    </a>
  </div>
`;

const sendResetPasswordEmail = (to: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

  const html = emailLayout(`
    ${emailHeading('Password Reset Request')}

    ${emailParagraph(
      'You requested to reset your password.',
    )}

    ${emailParagraph(
      'Click the button below to choose a new password:',
    )}

    ${emailButton(resetUrl, 'Reset Password')}

    ${emailParagraph(
      'For your security, this link will expire in 15 minutes.',
    )}

    <p style="
      margin: 20px 0 0;
      color: #aaa39c;
      font-size: 12px;
      line-height: 1.7;
    ">
      If you did not request a password reset, you can ignore this email.
      Your password will not change unless the reset process is completed.
    </p>
  `);

  return sendEmail(to, 'Password Reset Request', html);
};

const sendRecoverAccountEmail = (to: string, token: string) => {
  const recoverUrl = `${process.env.FRONTEND_URL}/auth/recover-account-verify?token=${token}`;

  const html = emailLayout(`
    ${emailHeading('Account Recovery Request')}

    ${emailParagraph(
      'We received a request to restore your Nestfinity account.',
    )}

    ${emailParagraph(
      'If you initiated this request, use the button below to continue recovering your account:',
    )}

    ${emailButton(recoverUrl, 'Recover Account')}

    ${emailParagraph(
      'For your security, this link will expire in 15 minutes.',
    )}

    <p style="
      margin: 20px 0 0;
      color: #aaa39c;
      font-size: 12px;
      line-height: 1.7;
    ">
      If you did not request account recovery, you can safely ignore this email.
    </p>
  `);

  return sendEmail(to, 'Recover Your Nestfinity Account', html);
};

const sendWarningRecoverAccount = (to: string, token: string) => {
  const recoverUrl = `${process.env.FRONTEND_URL}/auth/recover-account-verify?token=${token}`;

  const html = emailLayout(`
    ${emailHeading('⚠️ Final Warning')}

    <div style="
      margin: 0 0 18px;
      padding: 14px 16px;
      background-color: #2b2115;
      border-left: 3px solid #ffc244;
      border-radius: 4px;
    ">
      <p style="
        margin: 0;
        color: #ffc244;
        font-size: 15px;
        font-weight: bold;
        line-height: 1.6;
      ">
        Your Nestfinity account is scheduled for permanent deletion in 24 hours.
      </p>
    </div>

    ${emailParagraph(
      'If you still want to keep your account, use the button below to restore it.',
    )}

    ${emailParagraph(
      'If the account is permanently deleted, its data may no longer be recoverable.',
    )}

    ${emailButton(recoverUrl, 'Restore My Account')}

    <p style="
      margin: 20px 0 0;
      color: #aaa39c;
      font-size: 12px;
      line-height: 1.7;
    ">
      This is your final reminder before the scheduled deletion.
      Please restore your account before the deadline if you want to keep it.
    </p>
  `);

  return sendEmail(
    to,
    '⚠️ Final Warning: Account Deletion in 24 Hours',
    html,
  );
};

const sendEmailChangeVerification = (to: string, token: string) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email-change?token=${token}`;

  const html = emailLayout(`
    ${emailHeading('🔐 Email Change Request')}

    ${emailParagraph(
      'We received a request to change the email address associated with your Nestfinity account.',
    )}

    ${emailParagraph(
      'If you initiated this request, confirm the change using the button below.',
    )}

    ${emailButton(verifyUrl, 'Confirm Email Change')}

    ${emailParagraph(
      'For your security, this verification link is time-limited. Please use it promptly.',
    )}

    <div style="
      margin-top: 24px;
      padding: 16px;
      background-color: #25211b;
      border-radius: 6px;
    ">
      <p style="
        margin: 0 0 8px;
        color: #ffc244;
        font-size: 14px;
        font-weight: bold;
      ">
        Wasn't this you?
      </p>

      <p style="
        margin: 0;
        color: #fdf8f4;
        font-size: 13px;
        line-height: 1.8;
      ">
        If you did not request this change, do not click the confirmation button.
        If you suspect someone has accessed your account, contact Nestfinity
        support through the app's official support channel.
      </p>
    </div>
  `);

  return sendEmail(to, '🔐 Confirm Your Email Change', html);
};

export {
  sendResetPasswordEmail,
  sendRecoverAccountEmail,
  sendWarningRecoverAccount,
  sendEmailChangeVerification,
};

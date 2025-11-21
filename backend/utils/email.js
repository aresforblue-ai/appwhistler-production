// src/backend/utils/email.js
// Production-ready email service using SendGrid with HTML templates

const sgMail = require('@sendgrid/mail');
const { getSecret } = require('../../config/secrets.cjs');

// Configuration
const SENDGRID_API_KEY = getSecret('SENDGRID_API_KEY');
const FROM_EMAIL = getSecret('FROM_EMAIL', 'noreply@appwhistler.org');
const FROM_NAME = getSecret('FROM_NAME', 'AppWhistler');
const PASSWORD_RESET_BASE_URL = getSecret('PASSWORD_RESET_BASE_URL', 'http://localhost:3000/reset-password');
const APP_URL = getSecret('APP_URL', 'http://localhost:3000');

// Initialize SendGrid
if (SENDGRID_API_KEY && SENDGRID_API_KEY !== 'your_sendgrid_api_key') {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Base email template wrapper
 */
function getEmailTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AppWhistler</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background: #f8f8f8;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: #e0e0e0;
      margin: 20px 0;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 AppWhistler</h1>
      <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">AI-Powered Truth Tech Platform</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>
        <strong>AppWhistler</strong> - Fighting disinformation with AI and blockchain
      </p>
      <p>
        <a href="${APP_URL}">Visit AppWhistler</a> |
        <a href="${APP_URL}/privacy">Privacy Policy</a> |
        <a href="${APP_URL}/terms">Terms of Service</a>
      </p>
      <p style="margin-top: 15px; color: #999;">
        This email was sent to you because you have an account with AppWhistler.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Password Reset Email Template
 */
function getPasswordResetTemplate(username, resetLink, expirationMinutes = 60) {
  const content = `
    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>
      We received a request to reset your password. Click the button below to create a new password:
    </p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Your Password</a>
    </div>
    <p style="font-size: 14px; color: #666;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
    </p>
    <div class="info-box">
      <p style="margin: 0;">
        <strong>⏱️ This link expires in ${expirationMinutes} minutes</strong>
      </p>
    </div>
    <div class="divider"></div>
    <p style="font-size: 13px; color: #666;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;
  return getEmailTemplate(content);
}

/**
 * Welcome Email Template
 */
function getWelcomeTemplate(username, truthScore = 10) {
  const content = `
    <h2 style="color: #333; margin-top: 0;">Welcome to AppWhistler! 🎉</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>
      Thank you for joining AppWhistler - the AI-powered platform fighting disinformation
      through community-driven fact-checking and blockchain verification.
    </p>
    <div class="info-box">
      <p style="margin: 0;">
        <strong>🏆 Your Truth Score: ${truthScore}</strong><br>
        Earn points by submitting fact-checks, reviews, and helping the community!
      </p>
    </div>
    <h3 style="color: #333;">What You Can Do:</h3>
    <ul style="line-height: 1.8;">
      <li><strong>🔍 Submit Fact-Checks</strong> - Use AI to verify claims and earn +10 Truth Score</li>
      <li><strong>📱 Review Apps</strong> - Share your privacy and security insights</li>
      <li><strong>💰 Claim Bounties</strong> - Get rewarded for investigating high-priority claims</li>
      <li><strong>🏅 Climb the Leaderboard</strong> - Compete with top fact-checkers</li>
    </ul>
    <div style="text-align: center;">
      <a href="${APP_URL}/dashboard" class="button">Explore Your Dashboard</a>
    </div>
    <div class="divider"></div>
    <p style="font-size: 13px; color: #666;">
      Need help? Check out our <a href="${APP_URL}/guide" style="color: #667eea;">Getting Started Guide</a>
      or reach out to our community.
    </p>
  `;
  return getEmailTemplate(content);
}

/**
 * Fact-Check Notification Email Template
 */
function getFactCheckNotificationTemplate(username, factCheckDetails) {
  const { claim, verdict, confidence, url } = factCheckDetails;
  const verdictColor = {
    TRUE: '#28a745',
    FALSE: '#dc3545',
    MISLEADING: '#ffc107',
    UNVERIFIED: '#6c757d'
  }[verdict] || '#6c757d';

  const content = `
    <h2 style="color: #333; margin-top: 0;">New Fact-Check Activity 📊</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>A fact-check you're following has been updated:</p>
    <div class="info-box">
      <p style="margin: 0 0 10px;"><strong>Claim:</strong></p>
      <p style="font-style: italic; margin: 0 0 15px;">"${claim}"</p>
      <p style="margin: 0;">
        <strong>Verdict:</strong>
        <span style="color: ${verdictColor}; font-weight: 600;">${verdict}</span>
        ${confidence ? ` (${Math.round(confidence * 100)}% confidence)` : ''}
      </p>
    </div>
    <div style="text-align: center;">
      <a href="${url}" class="button">View Fact-Check Details</a>
    </div>
  `;
  return getEmailTemplate(content);
}

/**
 * Account Lockout Warning Email Template
 */
function getAccountLockoutTemplate(username, lockoutDurationMinutes, unlockTime) {
  const content = `
    <h2 style="color: #dc3545; margin-top: 0;">⚠️ Account Temporarily Locked</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>
      Your account has been temporarily locked due to multiple failed login attempts.
    </p>
    <div class="info-box" style="border-left-color: #dc3545;">
      <p style="margin: 0;">
        <strong>Unlock Time:</strong> ${unlockTime}<br>
        <strong>Duration:</strong> ${lockoutDurationMinutes} minutes
      </p>
    </div>
    <p>
      If you didn't attempt to log in, please reset your password immediately to secure your account.
    </p>
    <div style="text-align: center;">
      <a href="${PASSWORD_RESET_BASE_URL}" class="button" style="background: #dc3545;">
        Reset Password Now
      </a>
    </div>
    <div class="divider"></div>
    <p style="font-size: 13px; color: #666;">
      For security concerns, contact our support team.
    </p>
  `;
  return getEmailTemplate(content);
}

/**
 * Send email via SendGrid
 */
async function sendEmail(to, subject, htmlContent, textContent) {
  // If SendGrid is not configured, log to console (development mode)
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'your_sendgrid_api_key') {
    console.log(`\n📧 [DEV MODE] Email would be sent to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text Content:\n${textContent || 'See HTML content'}\n`);
    return {
      success: true,
      mode: 'development',
      recipient: to
    };
  }

  try {
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${to}`);
    return {
      success: true,
      mode: 'production',
      recipient: to
    };
  } catch (error) {
    console.error(`❌ Email send error:`, error.response?.body || error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(recipient, token, username = 'User') {
  const resetLink = `${PASSWORD_RESET_BASE_URL}?token=${encodeURIComponent(token)}`;
  const htmlContent = getPasswordResetTemplate(username, resetLink);
  const textContent = `
Hi ${username},

We received a request to reset your password for AppWhistler.

Reset your password by clicking this link:
${resetLink}

This link expires in 60 minutes.

If you didn't request a password reset, you can safely ignore this email.

- The AppWhistler Team
  `;

  await sendEmail(
    recipient,
    'Reset Your AppWhistler Password',
    htmlContent,
    textContent
  );

  return { recipient, resetLink };
}

/**
 * Send welcome email to new users
 */
async function sendWelcomeEmail(recipient, username, truthScore = 10) {
  const htmlContent = getWelcomeTemplate(username, truthScore);
  const textContent = `
Hi ${username},

Welcome to AppWhistler! 🎉

Thank you for joining our AI-powered platform fighting disinformation through
community-driven fact-checking and blockchain verification.

Your Truth Score: ${truthScore}

What You Can Do:
- Submit Fact-Checks: Use AI to verify claims and earn +10 Truth Score
- Review Apps: Share your privacy and security insights
- Claim Bounties: Get rewarded for investigating high-priority claims
- Climb the Leaderboard: Compete with top fact-checkers

Get started: ${APP_URL}/dashboard

- The AppWhistler Team
  `;

  await sendEmail(
    recipient,
    'Welcome to AppWhistler - Start Fighting Disinformation!',
    htmlContent,
    textContent
  );

  return { success: true };
}

/**
 * Send fact-check notification
 */
async function sendFactCheckNotification(recipient, username, factCheckDetails) {
  const htmlContent = getFactCheckNotificationTemplate(username, factCheckDetails);
  const { claim, verdict } = factCheckDetails;
  const textContent = `
Hi ${username},

A fact-check you're following has been updated:

Claim: "${claim}"
Verdict: ${verdict}

View details: ${factCheckDetails.url}

- The AppWhistler Team
  `;

  await sendEmail(
    recipient,
    `Fact-Check Update: ${verdict}`,
    htmlContent,
    textContent
  );

  return { success: true };
}

/**
 * Send account lockout warning
 */
async function sendAccountLockoutEmail(recipient, username, lockoutDurationMinutes, unlockTime) {
  const htmlContent = getAccountLockoutTemplate(username, lockoutDurationMinutes, unlockTime);
  const textContent = `
Hi ${username},

Your account has been temporarily locked due to multiple failed login attempts.

Unlock Time: ${unlockTime}
Duration: ${lockoutDurationMinutes} minutes

If you didn't attempt to log in, please reset your password immediately:
${PASSWORD_RESET_BASE_URL}

- The AppWhistler Team
  `;

  await sendEmail(
    recipient,
    '⚠️ AppWhistler Account Temporarily Locked',
    htmlContent,
    textContent
  );

  return { success: true };
}

/**
 * Send generic notification email
 */
async function sendNotificationEmail(recipient, username, subject, message, actionUrl, actionText) {
  const content = `
    <h2 style="color: #333; margin-top: 0;">${subject}</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>${message}</p>
    ${actionUrl ? `
      <div style="text-align: center;">
        <a href="${actionUrl}" class="button">${actionText || 'Take Action'}</a>
      </div>
    ` : ''}
  `;
  const htmlContent = getEmailTemplate(content);
  const textContent = `
Hi ${username},

${message}

${actionUrl ? `${actionText || 'Take Action'}: ${actionUrl}` : ''}

- The AppWhistler Team
  `;

  await sendEmail(recipient, subject, htmlContent, textContent);
  return { success: true };
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendFactCheckNotification,
  sendAccountLockoutEmail,
  sendNotificationEmail
};
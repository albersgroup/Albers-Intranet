import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// SMTP Configuration from environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.office365.us',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@albers.aero';

// Create transporter
function createTransporter(): Transporter {
  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.warn('SMTP credentials not configured. Emails will not be sent. Set SMTP_USER and SMTP_PASS environment variables.');
    // Return a mock transporter for development
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    }) as any;
  }

  return nodemailer.createTransport(SMTP_CONFIG);
}

// Generic email sending function
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export async function sendVerificationEmail(to: string, code: string) {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: 'Verify Your Albers Aerospace Account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background-color: #f3f4f6;
                padding: 40px 20px;
              }
              .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #3d1421 0%, #5a1f31 50%, #7a2942 100%);
                padding: 50px 40px 40px;
                text-align: center;
                position: relative;
              }
              .header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%);
              }
              .logo {
                font-size: 32px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 1px;
                margin-bottom: 8px;
              }
              .tagline {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              .content {
                padding: 50px 40px;
              }
              h1 {
                font-size: 28px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 16px;
                text-align: center;
              }
              p {
                font-size: 16px;
                color: #4b5563;
                margin-bottom: 24px;
                text-align: center;
              }
              .code-container {
                background: #f9fafb;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                padding: 30px;
                margin: 32px 0;
                text-align: center;
              }
              .code-label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #6b7280;
                margin-bottom: 12px;
              }
              .code {
                font-size: 42px;
                font-weight: 700;
                color: #51142a;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              }
              .expiry {
                font-size: 14px;
                color: #9ca3af;
                margin-top: 12px;
              }
              .footer {
                background: #f9fafb;
                padding: 30px 40px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
              }
              .footer-text {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 8px;
              }
              .footer-link {
                color: #51142a;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <div class="logo">ALBERS AEROSPACE</div>
                <div class="tagline">Intranet Portal</div>
              </div>

              <div class="content">
                <h1>Verify Your Email Address</h1>
                <p>Welcome to the Albers Aerospace Intranet! Please use the verification code below to complete your registration.</p>

                <div class="code-container">
                  <div class="code-label">Your Verification Code</div>
                  <div class="code">${code}</div>
                  <div class="expiry">This code expires in 15 minutes</div>
                </div>

                <p>If you didn't create an account with Albers Aerospace, you can safely ignore this email.</p>
              </div>

              <div class="footer">
                <div class="footer-text">
                  <strong>Albers Aerospace Corporation</strong>
                </div>
                <div class="footer-text">
                  This is an automated message, please do not reply to this email.
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: 'Reset Your Albers Aerospace Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                background-color: #f3f4f6;
                padding: 40px 20px;
              }
              .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #3d1421 0%, #5a1f31 50%, #7a2942 100%);
                padding: 50px 40px 40px;
                text-align: center;
                position: relative;
              }
              .header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%);
              }
              .logo {
                font-size: 32px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 1px;
                margin-bottom: 8px;
              }
              .tagline {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              .content {
                padding: 50px 40px;
              }
              h1 {
                font-size: 28px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 16px;
                text-align: center;
              }
              p {
                font-size: 16px;
                color: #4b5563;
                margin-bottom: 24px;
                text-align: center;
              }
              .button-container {
                text-align: center;
                margin: 32px 0;
              }
              .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: #ffffff;
                text-decoration: none;
                padding: 16px 40px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                box-shadow: 0 4px 6px rgba(81, 20, 42, 0.3);
              }
              .expiry {
                font-size: 14px;
                color: #9ca3af;
                margin-top: 24px;
              }
              .security-notice {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 24px 0;
                border-radius: 4px;
              }
              .security-notice p {
                font-size: 14px;
                color: #92400e;
                text-align: left;
                margin: 0;
              }
              .footer {
                background: #f9fafb;
                padding: 30px 40px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
              }
              .footer-text {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 8px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <div class="logo">ALBERS AEROSPACE</div>
                <div class="tagline">Intranet Portal</div>
              </div>

              <div class="content">
                <h1>Reset Your Password</h1>
                <p>We received a request to reset your password for your Albers Aerospace Intranet account.</p>

                <div class="button-container">
                  <a href="${resetLink}" class="reset-button">Reset Password</a>
                </div>

                <div class="expiry">This link expires in 1 hour</div>

                <div class="security-notice">
                  <p><strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and contact IT support if you have concerns about your account security.</p>
                </div>
              </div>

              <div class="footer">
                <div class="footer-text">
                  <strong>Albers Aerospace Corporation</strong>
                </div>
                <div class="footer-text">
                  This is an automated message, please do not reply to this email.
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

export async function sendNewOpportunityEmail(formData: any) {
  try {
    const transporter = createTransporter();

    // Recipients: BD managers
    const recipients = ['rmittenmeyer@albers.aero', 'dsteneman@albers.aero'];

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: recipients,
      subject: `New Business Opportunity: ${formData.opportunityName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: white;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .field {
                margin-bottom: 20px;
              }
              .label {
                font-weight: 600;
                color: #51142a;
                margin-bottom: 5px;
              }
              .value {
                color: #4b5563;
              }
              .footer {
                background: #f9fafb;
                padding: 20px;
                border-radius: 0 0 8px 8px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>New Business Opportunity Submitted</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Opportunity Name:</div>
                <div class="value">${formData.opportunityName || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Submitted By:</div>
                <div class="value">${formData.submitterName} (${formData.submitterEmail})</div>
              </div>
              <div class="field">
                <div class="label">Customer/Agency:</div>
                <div class="value">${formData.customer || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Description:</div>
                <div class="value">${formData.description || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Estimated Value:</div>
                <div class="value">${formData.estimatedValue || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">Timeline:</div>
                <div class="value">${formData.timeline || 'N/A'}</div>
              </div>
            </div>
            <div class="footer">
              <p>Log in to the Albers Aerospace Intranet to review this opportunity.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('New opportunity email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send new opportunity email:', error);
    throw error;
  }
}

export async function sendAdminAssignmentEmail(to: string, firstName: string, newRole: string, intranetUrl: string) {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: 'Admin Access Granted - Albers Aerospace Intranet',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: white;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .role-badge {
                display: inline-block;
                background: #fef3c7;
                color: #92400e;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                margin: 16px 0;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: white;
                text-decoration: none;
                padding: 12px 32px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 20px;
                border-radius: 0 0 8px 8px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Admin Access Granted</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>You have been granted administrative privileges on the Albers Aerospace Intranet.</p>
              <div class="role-badge">New Role: ${newRole}</div>
              <p>With this new role, you now have access to administrative features and controls.</p>
              <div style="text-align: center;">
                <a href="${intranetUrl}" class="cta-button">Access Intranet</a>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                If you have questions about your new permissions, please contact the system administrator.
              </p>
            </div>
            <div class="footer">
              <p>Albers Aerospace Corporation</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Admin assignment email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send admin assignment email:', error);
    throw error;
  }
}

export async function sendTrainingAssignmentEmail(
  to: string,
  firstName: string,
  trainingTitle: string,
  trainingCategory: string,
  dueDate: string | null,
  intranetUrl: string
) {
  try {
    const transporter = createTransporter();

    const dueDateText = dueDate
      ? `<div class="due-date">Due Date: ${new Date(dueDate).toLocaleDateString()}</div>`
      : '';

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `Training Assignment: ${trainingTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: white;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .training-info {
                background: #f9fafb;
                padding: 20px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .training-title {
                font-size: 20px;
                font-weight: 600;
                color: #51142a;
                margin-bottom: 8px;
              }
              .training-category {
                color: #6b7280;
                font-size: 14px;
                margin-bottom: 12px;
              }
              .due-date {
                background: #fef3c7;
                color: #92400e;
                padding: 8px 12px;
                border-radius: 4px;
                display: inline-block;
                font-size: 14px;
                font-weight: 600;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: white;
                text-decoration: none;
                padding: 12px 32px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 20px;
                border-radius: 0 0 8px 8px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>New Training Assignment</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>You have been assigned a new training module:</p>
              <div class="training-info">
                <div class="training-title">${trainingTitle}</div>
                <div class="training-category">Category: ${trainingCategory}</div>
                ${dueDateText}
              </div>
              <p>Please complete this training at your earliest convenience.</p>
              <div style="text-align: center;">
                <a href="${intranetUrl}/business-development/training" class="cta-button">Start Training</a>
              </div>
            </div>
            <div class="footer">
              <p>Albers Aerospace Corporation</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Training assignment email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send training assignment email:', error);
    throw error;
  }
}

export async function sendIdiqMentionEmail(
  to: string,
  firstName: string,
  mentionedBy: string,
  opportunityTitle: string,
  commentText: string,
  opportunityUrl: string
) {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject: `You were mentioned in IDIQ: ${opportunityTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: white;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .mention-box {
                background: #f9fafb;
                padding: 20px;
                border-left: 4px solid #51142a;
                border-radius: 4px;
                margin: 20px 0;
              }
              .mentioned-by {
                font-weight: 600;
                color: #51142a;
                margin-bottom: 12px;
              }
              .comment {
                color: #4b5563;
                font-style: italic;
              }
              .opportunity-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin: 16px 0;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #51142a 0%, #7a2942 100%);
                color: white;
                text-decoration: none;
                padding: 12px 32px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 20px;
                border-radius: 0 0 8px 8px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>You Were Mentioned</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p><strong>${mentionedBy}</strong> mentioned you in a discussion about:</p>
              <div class="opportunity-title">${opportunityTitle}</div>
              <div class="mention-box">
                <div class="mentioned-by">@${mentionedBy} wrote:</div>
                <div class="comment">${commentText}</div>
              </div>
              <div style="text-align: center;">
                <a href="${opportunityUrl}" class="cta-button">View Discussion</a>
              </div>
            </div>
            <div class="footer">
              <p>Albers Aerospace Corporation</p>
              <p style="margin-top: 8px; font-size: 12px;">
                You can manage your notification preferences in your account settings.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('IDIQ mention email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send IDIQ mention email:', error);
    throw error;
  }
}

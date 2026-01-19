import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'gjames@albers.aero'
  };
}

export async function sendVerificationEmail(to: string, code: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
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
              .bou-badge {
                background: rgba(212, 175, 55, 0.15);
                border: 1.5px solid #d4af37;
                border-radius: 24px;
                padding: 10px 20px;
                margin: 16px auto 12px;
                display: inline-block;
              }
              .bou-badge table {
                margin: 0 auto;
              }
              .bou-logo {
                width: 28px;
                height: 28px;
                vertical-align: middle;
              }
              .bou-text {
                font-size: 14px;
                font-weight: 600;
                color: #d4af37;
                letter-spacing: 1.5px;
                vertical-align: middle;
                padding-left: 8px;
              }
              .tagline {
                font-size: 15px;
                font-style: italic;
                color: #d4af37;
                font-weight: 500;
                letter-spacing: 0.5px;
              }
              .content {
                padding: 48px 40px;
              }
              .title {
                font-size: 24px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 16px;
                text-align: center;
              }
              .subtitle {
                font-size: 16px;
                color: #6b7280;
                text-align: center;
                margin-bottom: 32px;
                line-height: 1.5;
              }
              .code-container {
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                border: 2px solid #3d1421;
                border-radius: 12px;
                padding: 32px;
                margin: 32px 0;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              }
              .code-label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #6b7280;
                font-weight: 600;
                margin-bottom: 12px;
              }
              .code {
                font-size: 42px;
                font-weight: 700;
                letter-spacing: 12px;
                color: #3d1421;
                font-family: 'Courier New', Consolas, monospace;
                text-align: center;
                user-select: all;
              }
              .expiry-notice {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px 20px;
                margin: 24px 0;
                border-radius: 6px;
              }
              .expiry-notice p {
                font-size: 14px;
                color: #92400e;
                margin: 0;
              }
              .expiry-notice strong {
                font-weight: 600;
                color: #78350f;
              }
              .info-text {
                font-size: 14px;
                color: #6b7280;
                text-align: center;
                margin-top: 24px;
              }
              .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
                margin: 32px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 32px 40px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
              }
              .footer-title {
                font-size: 14px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
              }
              .footer-subtitle {
                font-size: 13px;
                color: #6b7280;
                font-style: italic;
              }
              .footer-copyright {
                font-size: 12px;
                color: #9ca3af;
                margin-top: 16px;
              }
              @media only screen and (max-width: 600px) {
                .content {
                  padding: 32px 24px;
                }
                .header {
                  padding: 40px 24px;
                }
                .code {
                  font-size: 32px;
                  letter-spacing: 8px;
                }
                .title {
                  font-size: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <div class="logo">ALBERS AEROSPACE</div>
                <div class="bou-badge">
                  <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                    <tr>
                      <td style="vertical-align: middle;">
                        <svg class="bou-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#d4af37" stroke-width="3"/>
                          <circle cx="50" cy="50" r="35" fill="none" stroke="#d4af37" stroke-width="3" stroke-dasharray="10 5"/>
                          <circle cx="50" cy="50" r="25" fill="none" stroke="#d4af37" stroke-width="3" stroke-dasharray="5 3"/>
                          <text x="50" y="58" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#d4af37" text-anchor="middle">BOU</text>
                        </svg>
                      </td>
                      <td class="bou-text" style="font-size: 14px; font-weight: 600; color: #d4af37; letter-spacing: 1.5px; vertical-align: middle; padding-left: 8px;">
                        BUSINESS OPERATIONS UNIT
                      </td>
                    </tr>
                  </table>
                </div>
                <div class="tagline">American Made. Warfighter Ready.</div>
              </div>
              
              <div class="content">
                <h1 class="title">Welcome to the Portal</h1>
                <p class="subtitle">
                  Thank you for joining the Business Operations Unit Portal. 
                  Please verify your email address to complete your account setup.
                </p>
                
                <div class="code-container">
                  <div class="code-label">Your Verification Code</div>
                  <div class="code">${code}</div>
                </div>
                
                <div class="expiry-notice">
                  <p><strong>⏱ Time Sensitive:</strong> This code will expire in 15 minutes for security purposes.</p>
                </div>
                
                <div class="divider"></div>
                
                <p class="info-text">
                  If you didn't request this verification, you can safely ignore this email.
                </p>
              </div>
              
              <div class="footer">
                <div class="footer-title">Business Operations Unit Portal</div>
                <div class="footer-subtitle">Albers Aerospace | Supporting the Warfighter Mission</div>
                <div class="footer-copyright">© ${new Date().getFullYear()} Albers Aerospace. All rights reserved.</div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
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
              .bou-badge {
                background: rgba(212, 175, 55, 0.15);
                border: 1.5px solid #d4af37;
                border-radius: 24px;
                padding: 10px 20px;
                margin: 16px auto 12px;
                display: inline-block;
              }
              .bou-badge table {
                margin: 0 auto;
              }
              .bou-logo {
                width: 28px;
                height: 28px;
                vertical-align: middle;
              }
              .bou-text {
                font-size: 14px;
                font-weight: 600;
                color: #d4af37;
                letter-spacing: 1.5px;
                vertical-align: middle;
                padding-left: 8px;
              }
              .tagline {
                font-size: 15px;
                font-style: italic;
                color: #d4af37;
                font-weight: 500;
                letter-spacing: 0.5px;
              }
              .content {
                padding: 48px 40px;
              }
              .title {
                font-size: 24px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 16px;
                text-align: center;
              }
              .subtitle {
                font-size: 16px;
                color: #6b7280;
                text-align: center;
                margin-bottom: 32px;
                line-height: 1.5;
              }
              .button-container {
                text-align: center;
                margin: 32px 0;
              }
              .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #3d1421 0%, #5a1f31 100%);
                color: #ffffff;
                text-decoration: none;
                padding: 16px 48px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 6px rgba(61, 20, 33, 0.3);
                transition: all 0.3s ease;
              }
              .reset-button:hover {
                background: linear-gradient(135deg, #5a1f31 0%, #3d1421 100%);
                box-shadow: 0 6px 8px rgba(61, 20, 33, 0.4);
              }
              .expiry-notice {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px 20px;
                margin: 24px 0;
                border-radius: 6px;
              }
              .expiry-notice p {
                font-size: 14px;
                color: #92400e;
                margin: 0;
              }
              .expiry-notice strong {
                font-weight: 600;
                color: #78350f;
              }
              .info-text {
                font-size: 14px;
                color: #6b7280;
                text-align: center;
                margin-top: 24px;
              }
              .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
                margin: 32px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 32px 40px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
              }
              .footer-title {
                font-size: 14px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
              }
              .footer-subtitle {
                font-size: 13px;
                color: #6b7280;
                font-style: italic;
              }
              .footer-copyright {
                font-size: 12px;
                color: #9ca3af;
                margin-top: 16px;
              }
              @media only screen and (max-width: 600px) {
                .content {
                  padding: 32px 24px;
                }
                .header {
                  padding: 40px 24px;
                }
                .title {
                  font-size: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <div class="logo">ALBERS AEROSPACE</div>
                <div class="bou-badge">
                  <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                    <tr>
                      <td style="vertical-align: middle;">
                        <svg class="bou-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#d4af37" stroke-width="3"/>
                          <circle cx="50" cy="50" r="35" fill="none" stroke="#d4af37" stroke-width="3" stroke-dasharray="10 5"/>
                          <circle cx="50" cy="50" r="25" fill="none" stroke="#d4af37" stroke-width="3" stroke-dasharray="5 3"/>
                          <text x="50" y="58" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#d4af37" text-anchor="middle">BOU</text>
                        </svg>
                      </td>
                      <td class="bou-text" style="font-size: 14px; font-weight: 600; color: #d4af37; letter-spacing: 1.5px; vertical-align: middle; padding-left: 8px;">
                        BUSINESS OPERATIONS UNIT
                      </td>
                    </tr>
                  </table>
                </div>
                <div class="tagline">American Made. Warfighter Ready.</div>
              </div>
              
              <div class="content">
                <h1 class="title">Password Reset Request</h1>
                <p class="subtitle">
                  We received a request to reset your password for the Business Operations Unit Portal. 
                  Click the button below to create a new password.
                </p>
                
                <div class="button-container">
                  <a href="${resetLink}" class="reset-button">Reset Password</a>
                </div>
                
                <div class="expiry-notice">
                  <p><strong>⏱ Time Sensitive:</strong> This link will expire in 1 hour for security purposes.</p>
                </div>
                
                <div class="divider"></div>
                
                <p class="info-text">
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
              
              <div class="footer">
                <div class="footer-title">Business Operations Unit Portal</div>
                <div class="footer-subtitle">Albers Aerospace | Supporting the Warfighter Mission</div>
                <div class="footer-copyright">© ${new Date().getFullYear()} Albers Aerospace. All rights reserved.</div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

export async function sendNewOpportunityEmail(formData: any) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: ['rmittenmeyer@albers.aero', 'dsteneman@albers.aero'],
      subject: `New Business Opportunity: ${formData.oppName}`,
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
                max-width: 800px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #3d1421 0%, #5a1f31 50%, #7a2942 100%);
                padding: 40px;
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
                font-size: 28px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 1px;
                margin-bottom: 8px;
              }
              .tagline {
                font-size: 14px;
                color: #d4af37;
                font-weight: 500;
              }
              .content {
                padding: 40px;
              }
              .title {
                font-size: 24px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 2px solid #e5e7eb;
              }
              .section {
                margin-bottom: 32px;
              }
              .section-title {
                font-size: 16px;
                font-weight: 600;
                color: #3d1421;
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e7eb;
              }
              .field-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin-bottom: 16px;
              }
              .field {
                margin-bottom: 16px;
              }
              .field-label {
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }
              .field-value {
                font-size: 15px;
                color: #111827;
                font-weight: 500;
              }
              .field-value.empty {
                color: #9ca3af;
                font-style: italic;
              }
              .full-width {
                grid-column: 1 / -1;
              }
              .summary-box {
                background: #f9fafb;
                border-left: 4px solid #3d1421;
                padding: 16px;
                border-radius: 6px;
                margin-top: 8px;
              }
              .footer {
                background: #f9fafb;
                padding: 24px 40px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
              }
              .footer-text {
                font-size: 12px;
                color: #6b7280;
              }
              @media only screen and (max-width: 600px) {
                .field-row {
                  grid-template-columns: 1fr;
                }
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <div class="logo">ALBERS AEROSPACE</div>
                <div class="tagline">Business Operations Unit - New Opportunity Submission</div>
              </div>
              
              <div class="content">
                <h1 class="title">New Business Opportunity: ${formData.oppName}</h1>
                
                <div class="section">
                  <div class="section-title">Basic Information</div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Opportunity Name</div>
                      <div class="field-value">${formData.oppName}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Capture Manager</div>
                      <div class="field-value">${formData.captureManager}</div>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Opportunity Type</div>
                      <div class="field-value">${formData.opportunityType}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Discover Date</div>
                      <div class="field-value">${formData.discoverDate}</div>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Customer Name</div>
                      <div class="field-value">${formData.customerName}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Pursuit Phase</div>
                      <div class="field-value">${formData.pursuitPhase}</div>
                    </div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Classification & Structure</div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Business Vertical</div>
                      <div class="field-value">${formData.businessVertical}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Business Unit</div>
                      <div class="field-value">${formData.businessUnit || '<span class="empty">Not specified</span>'}</div>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Prime/Sub</div>
                      <div class="field-value">${formData.primeSub}</div>
                    </div>
                    ${formData.primeContractorName ? `
                    <div class="field">
                      <div class="field-label">Prime Contractor Name</div>
                      <div class="field-value">${formData.primeContractorName}</div>
                    </div>
                    ` : ''}
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Financial & Contract Details</div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Pricing Structure</div>
                      <div class="field-value">${formData.pricingStructure}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Approx Value</div>
                      <div class="field-value">${formData.approxValue || '<span class="empty">Not specified</span>'}</div>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">NAICS Code(s)</div>
                      <div class="field-value">${formData.naicsCodes}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Program Duration</div>
                      <div class="field-value">${formData.programDuration || '<span class="empty">Not specified</span>'}</div>
                    </div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Additional Information</div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Solicitation Number</div>
                      <div class="field-value">${formData.solicitationNumber || '<span class="empty">Not specified</span>'}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">GovWin ID #</div>
                      <div class="field-value">${formData.govWinId || '<span class="empty">Not specified</span>'}</div>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Final RFP Issue Date</div>
                      <div class="field-value">${formData.finalRfpIssueDate || '<span class="empty">Not specified</span>'}${formData.finalRfpIsEstimated ? ' <span style="color: #f59e0b;">(Estimated)</span>' : ''}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Marketplace Sector</div>
                      <div class="field-value">${formData.marketplaceSector || '<span class="empty">Not specified</span>'}</div>
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <div class="field-label">Solicitation Link</div>
                      <div class="field-value">${formData.solicitationLink ? `<a href="${formData.solicitationLink}" style="color: #3d1421;">${formData.solicitationLink}</a>` : '<span class="empty">Not specified</span>'}</div>
                    </div>
                    <div class="field">
                      <div class="field-label">Compliance Clause</div>
                      <div class="field-value">${formData.complianceClause || '<span class="empty">Not specified</span>'}</div>
                    </div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Opportunity Summary</div>
                  <div class="summary-box">
                    ${formData.opportunitySummary}
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <div class="footer-text">
                  Submitted via BOU Portal | ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'long', timeStyle: 'short' })}
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send opportunity email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending opportunity email:', error);
    throw error;
  }
}

const DIVISION_NAMES: Record<string, string> = {
  corporate: "Albers Corporate",
  defense: "Albers Defense",
  industrials: "Albers Industrials",
  advanced_programs: "Albers Advanced Programs",
};

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "System Admin",
  corporate_admin: "Corporate Admin",
  defense_admin: "Defense Admin",
  industrials_admin: "Industrials Admin",
  advanced_admin: "Advanced Programs Admin",
  viewer: "Viewer",
};

const ROLE_TO_DIVISION: Record<string, string | null> = {
  admin: null,
  corporate_admin: "corporate",
  defense_admin: "defense",
  industrials_admin: "industrials",
  advanced_admin: "advanced_programs",
  viewer: null,
};

export async function sendAdminAssignmentEmail(to: string, firstName: string, newRole: string, intranetUrl: string) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const roleDisplayName = ROLE_DISPLAY_NAMES[newRole] || newRole;
    const divisionId = ROLE_TO_DIVISION[newRole];
    const divisionName = divisionId ? DIVISION_NAMES[divisionId] : null;
    const isSystemAdmin = newRole === "admin";
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `You've Been Assigned as ${roleDisplayName} - Albers Aerospace Intranet`,
      html: `
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Admin Role Assignment</title>
          </head>
          <body bgcolor="#D9E4EC" style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #D9E4EC;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#D9E4EC" style="background-color: #D9E4EC;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="600" align="center" bgcolor="#ffffff" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    
                    <!-- Header -->
                    <tr>
                      <td bgcolor="#51142a" style="background-color: #51142a; padding: 40px 30px; text-align: center;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding-bottom: 16px;">
                              <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 2px; display: block;">ALBERS AEROSPACE</span>
                              <span style="font-size: 12px; color: #D9E4EC; letter-spacing: 3px; text-transform: uppercase; display: block; margin-top: 4px;">INTRANET PORTAL</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="text-align: center; padding-top: 12px;">
                              <span style="font-size: 13px; font-style: italic; color: #D9E4EC;">American Made. Warfighter Ready.</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Accent Bar -->
                    <tr>
                      <td bgcolor="#D9E4EC" style="height: 4px; background-color: #D9E4EC;"></td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td bgcolor="#ffffff" style="padding: 40px 30px; background-color: #ffffff;">
                        <p style="font-size: 18px; font-weight: 600; color: #51142a; margin: 0 0 20px 0;">Hello ${firstName}!</p>
                        
                        <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0; line-height: 1.7;">
                          You have been assigned administrative privileges on the Albers Aerospace Intranet. 
                          Your new role gives you the ability to manage content within your designated area.
                        </p>
                        
                        <!-- Role Badge -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td style="text-align: center;">
                              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                                <tr>
                                  <td bgcolor="#51142a" style="background-color: #51142a; padding: 12px 24px; border-radius: 8px;">
                                    <span style="font-size: 18px; font-weight: 600; color: #ffffff;">${roleDisplayName}</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- What You Can Do -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td bgcolor="#f3f4f6" style="background-color: #f3f4f6; border-left: 4px solid #51142a; padding: 20px; border-radius: 0 8px 8px 0;">
                              <p style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">What You Can Do:</p>
                              ${isSystemAdmin ? `
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Access the full Control Panel to manage all users</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Create, edit, and archive news articles for all divisions</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Manage newsletters across the entire organization</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Configure user roles and permissions</p>
                              ` : `
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Create news articles for ${divisionName}</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Edit existing ${divisionName} content</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Archive or delete outdated articles</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Keep your division's news up-to-date</p>
                              `}
                            </td>
                          </tr>
                        </table>
                        
                        <!-- How to Access -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                          <tr>
                            <td bgcolor="#f3f4f6" style="background-color: #f3f4f6; border-left: 4px solid #51142a; padding: 20px; border-radius: 0 8px 8px 0;">
                              <p style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">How to Access Your Admin Tools:</p>
                              <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Log in to the Albers Aerospace Intranet</p>
                              <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Look for the "Administration" section in the left sidebar</p>
                              ${isSystemAdmin ? `
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Click "Control Panel" to manage users</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Click "Manage News" to create and edit articles</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Click "Manage Newsletters" to upload newsletters</p>
                              ` : `
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Click "Edit ${divisionName} Content" to manage your division's news</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Use the "New Article" button to create content</p>
                                <p style="font-size: 14px; color: #374151; margin: 8px 0; padding-left: 16px;">&#10003; Click the edit or archive icons to modify existing articles</p>
                              `}
                            </td>
                          </tr>
                        </table>
                        
                        <!-- CTA Button -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0;">
                          <tr>
                            <td style="text-align: center;">
                              <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${intranetUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" strokecolor="#51142a" fillcolor="#51142a">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:'Segoe UI',sans-serif;font-size:15px;font-weight:600;">Go to Intranet</center>
                              </v:roundrect>
                              <![endif]-->
                              <!--[if !mso]><!-->
                              <a href="${intranetUrl}" style="display: inline-block; background-color: #51142a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.5px;">Go to Intranet</a>
                              <!--<![endif]-->
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td bgcolor="#f8f9fa" style="background-color: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="font-size: 14px; font-weight: 600; color: #51142a; margin: 0 0 4px 0;">Albers Aerospace</p>
                        <p style="color: #6b7280; font-size: 12px; margin: 0;">Company Intranet Portal</p>
                        <p style="font-size: 11px; color: #9ca3af; margin: 12px 0 0 0;">
                          This is an automated message from the Albers Aerospace Intranet.<br>
                          If you have questions about your new role, please contact your supervisor or IT support.
                        </p>
                        <p style="font-size: 11px; color: #9ca3af; font-style: italic; margin: 8px 0 0 0;">&copy; ${new Date().getFullYear()} Albers Aerospace. All rights reserved.</p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send admin assignment email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending admin assignment email:', error);
    throw error;
  }
}

export async function sendTrainingAssignmentEmail(
  to: string, 
  assigneeName: string,
  moduleName: string,
  assignerName: string,
  dueDate: string | null,
  trainingUrl: string
) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const dueDateText = dueDate ? `Due by: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : '';
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Training Assignment: ${moduleName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #3d1421 0%, #5a1f31 50%, #7a2942 100%); padding: 40px; text-align: center; position: relative;">
                        <div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 1px; margin-bottom: 8px;">ALBERS AEROSPACE</div>
                        <div style="font-size: 14px; color: #d4af37; font-weight: 500; font-style: italic;">Training Assignment</div>
                        <div style="height: 4px; background: linear-gradient(90deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%); position: absolute; bottom: 0; left: 0; right: 0;"></div>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center;">New Training Module Assigned</h1>
                        <p style="font-size: 16px; color: #6b7280; text-align: center; margin: 0 0 32px 0;">
                          Hello ${assigneeName}, you have been assigned a new training module to complete.
                        </p>
                        
                        <!-- Module Card -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border: 2px solid #3d1421; border-radius: 12px; margin: 24px 0;">
                          <tr>
                            <td style="padding: 24px;">
                              <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; font-weight: 600; margin: 0 0 8px 0;">Module Name</p>
                              <p style="font-size: 20px; font-weight: 700; color: #3d1421; margin: 0 0 16px 0;">${moduleName}</p>
                              <p style="font-size: 14px; color: #374151; margin: 0;">Assigned by: <strong>${assignerName}</strong></p>
                              ${dueDate ? `<p style="font-size: 14px; color: #dc2626; font-weight: 600; margin: 12px 0 0 0;">${dueDateText}</p>` : ''}
                            </td>
                          </tr>
                        </table>
                        
                        <!-- CTA Button -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0;">
                          <tr>
                            <td style="text-align: center;">
                              <a href="${trainingUrl}" style="display: inline-block; background: linear-gradient(135deg, #3d1421 0%, #5a1f31 100%); color: #ffffff; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Training Module</a>
                            </td>
                          </tr>
                        </table>
                        
                        <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%); margin: 32px 0;"></div>
                        
                        <p style="font-size: 14px; color: #6b7280; text-align: center;">
                          Click the button above or log in to the Albers Aerospace Intranet to access your assigned training.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 4px 0;">Business Operations Unit</p>
                        <p style="font-size: 13px; color: #6b7280; font-style: italic; margin: 0;">Albers Aerospace | Supporting the Warfighter Mission</p>
                        <p style="font-size: 12px; color: #9ca3af; margin: 16px 0 0 0;">&copy; ${new Date().getFullYear()} Albers Aerospace. All rights reserved.</p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send training assignment email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending training assignment email:', error);
    throw error;
  }
}

// IDIQ Mention Email - sent when a user is @mentioned in a comment
export async function sendIdiqMentionEmail(
  to: string,
  mentionedUserName: string,
  mentionerName: string,
  opportunityTitle: string,
  opportunityId: string,
  commentContent: string,
  intranetUrl: string
) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const viewUrl = `${intranetUrl}/idiq-management?opportunityId=${opportunityId}`;
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `${mentionerName} mentioned you in IDIQ discussion: ${opportunityTitle}`,
      html: `
        <!DOCTYPE html>
        <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <!--[if mso]>
            <xml>
              <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
            <![endif]-->
            <style type="text/css">
              body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
              table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
              img { -ms-interpolation-mode: bicubic; }
              body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    
                    <!-- Header with Albers Maroon -->
                    <tr>
                      <td align="center" style="background-color: #51142a; padding: 35px 40px; border-bottom: 4px solid #d4af37;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 1px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">ALBERS AEROSPACE</h1>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding-top: 8px;">
                              <span style="font-size: 14px; color: #d4af37; font-weight: 600; letter-spacing: 0.5px;">IDIQ MANAGEMENT</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #111827; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">You've Been Mentioned!</h2>
                        
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                          Hi ${mentionedUserName},
                        </p>
                        
                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                          <strong style="color: #51142a;">${mentionerName}</strong> mentioned you in a comment on an IDIQ opportunity:
                        </p>
                        
                        <!-- Opportunity Title Box -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                          <tr>
                            <td style="background-color: #f8f9fa; border-left: 4px solid #51142a; padding: 16px 20px;">
                              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${opportunityTitle}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Comment Quote Box -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                          <tr>
                            <td style="background-color: #fef3c7; border-left: 4px solid #d4af37; padding: 16px 20px;">
                              <p style="margin: 0 0 8px 0; font-size: 15px; font-style: italic; color: #78350f; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">"${commentContent}"</p>
                              <p style="margin: 0; font-size: 13px; color: #92400e; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">— ${mentionerName}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- CTA Button (Outlook-compatible) -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                          <tr>
                            <td align="center">
                              <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${viewUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="10%" stroke="f" fillcolor="#51142a">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:'Segoe UI',Tahoma,sans-serif;font-size:16px;font-weight:bold;">View Opportunity</center>
                              </v:roundrect>
                              <![endif]-->
                              <!--[if !mso]><!-->
                              <a href="${viewUrl}" target="_blank" style="display: inline-block; background-color: #51142a; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">View Opportunity</a>
                              <!--<![endif]-->
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Direct Link -->
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                          <tr>
                            <td align="center" style="padding: 16px; background-color: #f3f4f6; border-radius: 6px;">
                              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Or copy this link:</p>
                              <a href="${viewUrl}" style="font-size: 12px; color: #51142a; word-break: break-all; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${viewUrl}</a>
                            </td>
                          </tr>
                        </table>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        
                        <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                          Click the button above to view this opportunity and respond to the discussion.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #51142a; padding: 24px 40px; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">IDIQ Management Portal</p>
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: #d4af37; font-style: italic; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Albers Aerospace | Supporting the Warfighter Mission</p>
                        <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">&copy; ${new Date().getFullYear()} Albers Aerospace. All rights reserved.</p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(`Failed to send IDIQ mention email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error sending IDIQ mention email:', error);
    throw error;
  }
}

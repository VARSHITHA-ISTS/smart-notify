const https = require('https');
const nodemailer = require('nodemailer');

// 1. Resend API Dispatch Function
function sendViaResend(apiKey, emailData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: emailData.from,
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      bcc: emailData.bcc ? [emailData.bcc] : undefined
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, service: 'Resend', id: parsed.id });
          } else {
            let errorMsg = parsed.message || `Resend error HTTP ${res.statusCode}: ${data}`;
            if (errorMsg.includes('testing emails')) {
              errorMsg = `Resend restriction: 'onboarding@resend.dev' can only send to your own registered Resend email. To send to any recipient, verify your domain on Resend or use Gmail SMTP in .env.`;
            }
            reject(new Error(errorMsg));
          }
        } catch (e) {
          reject(new Error(`Resend response parse error: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

// 2. SMTP Transporter
let smtpTransporter = null;
function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;

  const user = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  const cleanPass = rawPass.replace(/\s+/g, '');

  if (!user || user === 'your-email@gmail.com' || !rawPass || rawPass === 'your-app-password') {
    return null;
  }

  if (process.env.SMTP_HOST) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: user,
        pass: cleanPass
      }
    });
  } else {
    smtpTransporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: user,
        pass: cleanPass
      }
    });
  }
  return smtpTransporter;
}

/**
 * Send email containing the unique Smart Notify message link
 * Priority order:
 * 1. Resend API (if RESEND_API_KEY is configured)
 * 2. SMTP (if SMTP_USER/SMTP_HOST is configured)
 * 3. Dev/Console Simulation (for zero-setup local development)
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.sender - Sender name
 * @param {string} options.senderEmail - Sender email (optional, for BCC copy)
 * @param {string} options.link - Unique message link (e.g. https://yourwebsite.com/m/8f72k9)
 * @param {string} options.message - The message text
 * @param {number|null} options.unlockAt - Scheduled unlock timestamp or null
 * @returns {Promise<Object>}
 */
async function dispatchEmail({ to, sender = 'A Friend', senderEmail = '', link, message = '', unlockAt = null }) {
  const fromAddress = process.env.EMAIL_FROM || 'Smart Notify <onboarding@resend.dev>';
  const cleanSender = (sender && sender.trim()) || 'A Friend';
  const subject = cleanSender !== 'A Friend' 
    ? `${cleanSender} sent you a message on Smart Notify`
    : `New message for you on Smart Notify`;

  let scheduleNote = '';
  if (unlockAt && unlockAt > Date.now()) {
    scheduleNote = `\n(Delivery note: Sealed until ${new Date(unlockAt).toLocaleString()})`;
  }

  // Plaintext version (clean, anti-spam, 100% deliverable)
  const textBody = 
`Hello,

${cleanSender} shared a private note with you on Smart Notify.

You can view it here:
${link}
${scheduleNote}

Best regards,
Smart Notify`;

  // Clean, high-deliverability HTML email
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You have received a message!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #050508;
      color: #ffffff;
      margin: 0;
      padding: 30px 15px;
    }
    .wrapper {
      max-width: 520px;
      margin: 0 auto;
      background: #0e0e18;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 24px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    }
    .logo {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 5px;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .heading {
      font-size: 19px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    .subtext {
      color: #9090aa;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn-open {
      display: inline-block;
      background: #ffffff;
      color: #050508 !important;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      padding: 15px 36px;
      border-radius: 12px;
      margin-top: 6px;
      margin-bottom: 24px;
    }
    .link-box {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 12px;
      font-size: 12px;
      color: #72728e;
      word-break: break-all;
      margin-bottom: 20px;
    }
    .link-box a {
      color: #38bdf8;
      text-decoration: none;
    }
    .time-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 100px;
      font-size: 11.5px;
      background: rgba(255, 183, 3, 0.12);
      border: 1px solid rgba(255, 183, 3, 0.35);
      color: #ffb703;
      margin-bottom: 18px;
    }
    .footer {
      font-size: 11.5px;
      color: #55556a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 18px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">SMART NOTIFY</div>
    
    <div class="heading">You have received a message!</div>
    <p class="subtext">
      <strong>${sender}</strong> has shared a private aesthetic moment with you.
    </p>

    ${unlockAt && unlockAt > Date.now() ? `<div class="time-badge">⏳ Sealed in Time Capsule until ${new Date(unlockAt).toLocaleString()}</div>` : ''}

    <div>
      <a href="${link}" class="btn-open" target="_blank">Read Message</a>
    </div>

    <div class="link-box">
      If the button above does not open, visit this link directly:<br>
      <a href="${link}">${link}</a>
    </div>

    <div class="footer">
      A message shared with you on Smart Notify.
    </div>
  </div>
</body>
</html>
`;

  const emailData = {
    from: fromAddress,
    to: to,
    bcc: (senderEmail && senderEmail.includes('@')) ? senderEmail : undefined,
    subject: subject,
    text: textBody,
    html: htmlBody
  };

 
  // 1. Try Resend API if a valid API Key is configured
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const isValidResendKey = resendKey.startsWith('re_') && !resendKey.startsWith('re_re_') && !resendKey.includes('...') && resendKey.length > 20;

  if (isValidResendKey) {
    try {
      const result = await sendViaResend(resendKey, emailData);
      console.log(`[Resend] Email accepted for ${to} (ID: ${result.id})`);
      return { success: true, service: 'Resend', id: result.id };
    } catch (err) {
      console.error('[Resend Error]', err.message);
      throw new Error(err.message);
    }
  }

  // 2. Try SMTP (e.g. Gmail with App Password) if configured
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: `"${sender} via Smart Notify" <${process.env.SMTP_USER}>`,
        to: emailData.to,
        bcc: emailData.bcc,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html
      });

      console.log(`[SMTP] Email accepted for ${to} (MessageId: ${info.messageId})`);
      return { success: true, service: 'Gmail/SMTP', messageId: info.messageId };
    } catch (err) {
      console.error('[SMTP Error]', err.message);
      throw new Error(`Gmail/SMTP failed: ${err.message}`);
    }
  }

  // 3. No valid email service is configured
  let missingReason = 'No email credentials in .env.';
  if (resendKey && (resendKey.includes('...') || resendKey.startsWith('re_re_'))) {
    missingReason = 'The RESEND_API_KEY in .env is incomplete or invalid.';
  } else if (process.env.SMTP_USER && process.env.SMTP_USER !== 'your-email@gmail.com') {
    missingReason = 'SMTP_PASS (Google App Password) is missing in .env.';
  }

  throw new Error(`${missingReason} Please configure a 16-character Google App Password or valid Resend key in .env.`);
 
}

module.exports = {
  dispatchEmail
};
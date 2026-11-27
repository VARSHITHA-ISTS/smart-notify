const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { dispatchEmail } = require('./emailService');

// Simple .env parser to avoid mandatory dotenv dependency
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static assets from project root
app.use(express.static(__dirname));

/**
 * Determine Public Base URL
 */
function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

// ==========================================
// API ROUTES
// ==========================================

/**
 * POST /api/messages
 * Creates a unique message in the database and sends the email containing the unique link
 */
app.post('/api/messages', async (req, res) => {
  try {
    const { 
      to, 
      recipient, 
      sender, 
      senderEmail, 
      message, 
      text, 
      theme, 
      font, 
      fontName, 
      dimension, 
      bgEffects, 
      unlockAt,
      expiryOption,
      expiryHours
    } = req.body;

    const recipientEmail = (to || recipient || '').trim();
    const messageContent = (message || text || '').trim();

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid recipient email is required.' });
    }
    if (!messageContent) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // 1. Store in Database & Generate Unique ID
    const stored = db.createMessage({
      recipient: recipientEmail,
      sender: sender,
      senderEmail: senderEmail,
      message: messageContent,
      theme,
      font,
      fontName,
      dimension,
      bgEffects,
      unlockAt,
      expiryOption,
      expiryHours
    });

    // 2. Generate Unique Link
    const baseUrl = getBaseUrl(req);
    const uniqueLink = `${baseUrl}/m/${stored.id}`;

    // 3. Dispatch Email with unique link via Resend / SMTP / Dev
    let emailResult = null;
    let emailError = null;
    try {
      emailResult = await dispatchEmail({
        to: stored.recipient,
        sender: stored.sender,
        senderEmail: stored.senderEmail,
        link: uniqueLink,
        message: stored.message,
        unlockAt: stored.unlockAt
      });
      console.log(`[Smart Notify] Message created & email dispatched: ${stored.id} -> ${stored.recipient}`);
    } catch (dispatchErr) {
      emailError = dispatchErr.message;
      console.warn(`[Smart Notify] Message ${stored.id} saved, but automated email failed:`, dispatchErr.message);
    }

    res.json({
      success: true,
      id: stored.id,
      url: uniqueLink,
      expiresAt: stored.expiresAt,
      emailDelivered: !emailError,
      emailStatus: emailResult,
      emailError: emailError
    });
  } catch (err) {
    console.error('Error in /api/messages:', err);
    res.status(500).json({ error: 'Failed to create and save message.', details: err.message });
  }
});

/**
 * GET /api/messages/:id
 * Retrieves a stored message for the recipient by unique ID
 */
app.get('/api/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const record = db.getMessage(id);

    if (!record) {
      return res.status(404).json({ error: 'Message not found or does not exist.' });
    }

    if (record.expired) {
      return res.status(410).json({ error: 'This message has expired and is no longer available.' });
    }

    res.json({
      success: true,
      message: {
        id: record.id,
        sender: record.sender,
        message: record.message,
        theme: record.theme,
        font: record.font,
        fontName: record.fontName,
        dimension: record.dimension,
        bgEffects: record.bgEffects,
        unlockAt: record.unlockAt,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt
      }
    });
  } catch (err) {
    console.error('Error in GET /api/messages/:id:', err);
    res.status(500).json({ error: 'Failed to fetch message.' });
  }
});

// Backward compatibility with legacy /api/send-email endpoint
app.post('/api/send-email', async (req, res) => {
  const { to, sender, senderEmail, message, unlockSchedule, url } = req.body;
  if (!to) return res.status(400).json({ error: 'Recipient email is required.' });

  try {
    const emailResult = await dispatchEmail({
      to,
      sender: sender || 'A Friend',
      senderEmail,
      link: url,
      message,
      unlockAt: null
    });
    res.json({ success: true, emailResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FRONTEND SERVING
// ==========================================

// Unique Short Message Reveal Link: /m/:id or /message/:id
app.get(['/m/:id', '/message/:id'], (req, res) => {
  res.sendFile(path.join(__dirname, 'message.html'));
});

// Root Sender Experience
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Default Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/m/')) {
    return res.sendFile(path.join(__dirname, 'message.html'));
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✦ SMART NOTIFY PUBLIC SERVER ACTIVE`);
    console.log(`✦ Running on: http://localhost:${PORT}`);
    console.log(`✦ Sender Page: http://localhost:${PORT}`);
    console.log(`✦ Message Links: http://localhost:${PORT}/m/:id`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;

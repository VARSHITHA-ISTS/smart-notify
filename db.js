const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'messages.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2), 'utf8');
}

// Generate short, collision-resistant unique ID (e.g. '8f72k9')
// Uses non-ambiguous characters (avoiding 0/O, 1/I/l)
const CHARSET = '23456789abcdefghjkmnpqrstuvwxyz';
function generateId(length = 6) {
  const bytes = crypto.randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += CHARSET[bytes[i] % CHARSET.length];
  }
  return id;
}

// Read database
function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('Error reading database:', err);
    return {};
  }
}

// Write database atomically
function writeDb(data) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

/**
 * Create and store a new message
 * @param {Object} payload 
 * @returns {Object} Stored message with generated ID and metadata
 */
function createMessage(payload) {
  const db = readDb();
  let id;
  // Ensure unique ID
  do {
    id = generateId(6);
  } while (db[id]);

  const now = Date.now();
  
  // Calculate expiration (e.g., 24 hours, 30 days, or null for forever)
  let expiresAt = null;
  if (payload.expiryOption === '24h' || payload.expiryHours === 24) {
    expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
  } else if (payload.expiryOption === '30d' || payload.expiryDays === 30 || (!payload.expiryOption && payload.expiryOption !== 'forever')) {
    expiresAt = now + (30 * 24 * 60 * 60 * 1000); // Default: 30 days
  } else if (payload.expiryOption === 'forever') {
    expiresAt = null;
  }

  const record = {
    id,
    sender: (payload.sender && payload.sender.trim()) || 'A Friend',
    senderEmail: payload.senderEmail || '',
    recipient: payload.recipient || payload.to || '',
    message: payload.message || payload.text || '',
    theme: payload.theme || 'cosmic',
    font: payload.font || "'Italiana', serif",
    fontName: payload.fontName || 'Italiana',
    dimension: payload.dimension || '3d', // '3d', 'dots', or 'normal'
    bgEffects: payload.bgEffects || { polygons: true, particles: true, bloom: true, trails: true, nebula: true },
    unlockAt: payload.unlockAt ? Number(payload.unlockAt) : null,
    expiresAt: expiresAt,
    createdAt: now,
    viewCount: 0
  };

  db[id] = record;
  writeDb(db);
  return record;
}

/**
 * Get message by unique ID
 * @param {string} id 
 * @returns {Object|null} Message object or null if not found/expired
 */
function getMessage(id) {
  if (!id) return null;
  const db = readDb();
  const record = db[id];
  if (!record) return null;

  // Check expiration
  if (record.expiresAt && Date.now() > record.expiresAt) {
    return { expired: true, id };
  }

  // Increment view counter
  record.viewCount = (record.viewCount || 0) + 1;
  record.lastViewedAt = Date.now();
  db[id] = record;
  writeDb(db);

  return record;
}

/**
 * Delete message by ID
 * @param {string} id 
 */
function deleteMessage(id) {
  const db = readDb();
  if (db[id]) {
    delete db[id];
    writeDb(db);
    return true;
  }
  return false;
}

/**
 * Clean up expired messages
 */
function cleanupExpired() {
  const db = readDb();
  const now = Date.now();
  let changed = false;
  for (const id in db) {
    if (db[id].expiresAt && now > db[id].expiresAt) {
      delete db[id];
      changed = true;
    }
  }
  if (changed) {
    writeDb(db);
  }
}

// Run cleanup every 6 hours
setInterval(cleanupExpired, 6 * 60 * 60 * 1000);

module.exports = {
  createMessage,
  getMessage,
  deleteMessage,
  cleanupExpired
};

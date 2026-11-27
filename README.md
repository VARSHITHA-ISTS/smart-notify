# ✦ Smart Notify — Public Message Link Platform

An official, public web application where anyone in the world can write an aesthetic secret message, enter a receiver's email address, and send a unique link. 

The website handles message creation, storage, and email delivery automatically on behalf of your users. Visitors **do not** need to connect their own Gmail, SMTP, or EmailJS accounts.

When the recipient clicks the link (e.g. `https://yourwebsite.com/m/8f72k9`), they see **only the message on a clean, cinematic page** with celestial sound, atmospheric stardust, 3D/dots typography, and an exit button — never the sender's editing form.

---

## 🚀 How It Works

```
┌────────────────────────────────┐
│   1. SENDER OPENS WEBSITE      │
│   Writes 3-line message        │
│   Chooses visual aura & font   │
│   Enters recipient email       │
│   Clicks "Send Moment ➔"       │
└───────────────┬────────────────┘
                │
                ▼ (POST /api/messages)
┌────────────────────────────────┐
│   2. BACKEND & DATABASE        │
│   Generates unique ID: 8f72k9  │
│   Saves message in database    │
│   Sets expiration (30d/24h/∞)  │
│   Dispatches email via Resend  │
└───────────────┬────────────────┘
                │
                ▼ (Automated Email)
┌────────────────────────────────┐
│   3. RECIPIENT INBOX           │
│   "You have received a message!│
│   Click below to read:"        │
│   https://yourwebsite.com/     │
│   m/8f72k9                     │
└───────────────┬────────────────┘
                │
                ▼ (Opens link)
┌────────────────────────────────┐
│   4. CINEMATIC REVEAL PAGE     │
│   Dark screen & stardust       │
│   "FROM [SENDER]"              │
│   Letter-by-letter 3D reveal   │
│   Harmonic chime chords        │
│   Clean page & Exit button     │
└────────────────────────────────┘
```

---

## 🛠️ Project Structure

```
smart-notify/
├── index.html           # Sender creation interface (2-step glassmorphic UI)
├── message.html         # Recipient reveal experience (cinematic, audio, 3D/dots)
├── server.js            # Express server (API endpoints, static router, /m/:id router)
├── db.js                # Embedded atomic database manager (messages.json)
├── emailService.js      # Email dispatcher (Resend API + SMTP fallback + Dev simulator)
├── data/
│   └── messages.json    # JSON storage for unique message links (auto-created)
├── package.json         # Node.js dependencies (express, cors, nodemailer)
├── .env.example         # Production environment template
├── .env                 # Local configuration file
└── README.md            # Setup and deployment documentation
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** (v18 or higher recommended) installed on your computer.

### 2. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
You will see:
```text
======================================================
✦ SMART NOTIFY PUBLIC SERVER ACTIVE
✦ Running on: http://localhost:3000
✦ Sender Page: http://localhost:3000
✦ Message Links: http://localhost:3000/m/:id
======================================================
```

### 4. Open in Browser
Visit **`http://localhost:3000`** in any browser.

> **Note on Local Dev Mode:** If no email API key is configured yet, the server logs the exact email dispatch and clickable link directly in the terminal console and in the web modal so you can test the recipient reveal immediately without needing external API credentials!

---

## 📧 Production Email Configuration

Smart Notify sends emails centrally from the server. You configure your email provider once, and your visitors send messages for free.

### Option 1: Resend API (Recommended)
[Resend](https://resend.com) is modern, developer-friendly, and offers 3,000 free emails/month.
1. Sign up at [resend.com](https://resend.com) and get an API key.
2. In your `.env` file, set:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=Smart Notify <onboarding@resend.dev>
   BASE_URL=https://yourdomain.com
   ```
   *(When you verify your custom domain on Resend, change `EMAIL_FROM` to e.g. `messages@yourdomain.com`)*.

### Option 2: SMTP / Gmail (Alternative)
In your `.env` file, set:
```env
SMTP_SERVICE=gmail
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
BASE_URL=https://yourdomain.com
```

---

## 🔒 Link Expiration & Security

Senders can choose from three link lifetime options:
1. **30 Days (Standard)**: Link remains active for 30 days, then securely auto-expires.
2. **24 Hours (Ephemeral)**: Link automatically expires after 24 hours (ideal for sensitive notes).
3. **Forever (Permanent)**: Stays accessible without expiration.

Expired messages return an atmospheric *"✦ This moment has expired"* notice and are purged from database storage automatically.

---

## 🌐 Deploying to Production (Worldwide Access)

### Option 1: GitHub Pages (Recommended — 100% Free, 24/7, No Server Needed)
See the full guide in [DEPLOY_TO_GITHUB_PAGES.md](DEPLOY_TO_GITHUB_PAGES.md).
1. Create a public repository named `smart-notify` on [GitHub](https://github.com/new).
2. Push your project to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/smart-notify.git
   git branch -M main
   git push -u origin main
   ```
3. Go to **Settings > Pages**, choose branch `main` and root `/`, then save!
4. Your website is live at `https://YOUR-USERNAME.github.io/smart-notify`.

### Option 2: Deploy Backend to Vercel / Render / Railway:
1. Push your project to GitHub.
2. Connect your repository to [Vercel](https://vercel.com) or [Render](https://render.com).
3. Set Build Command: `npm install`
4. Set Start Command: `node server.js`
5. Add Environment Variables:
   - `BASE_URL`: `https://your-app-name.onrender.com` (or your custom domain)
   - `RESEND_API_KEY`: Your Resend API key
   - `EMAIL_FROM`: `Smart Notify <onboarding@resend.dev>`
6. Deploy! Anyone worldwide can now visit your website and send messages.

# Google Drive Upload Backend — Setup Guide

## What Was Built

| Layer | Tech | Port |
|---|---|---|
| **Frontend** | React + Vite | `http://localhost:5173` |
| **Backend** | Express.js + Google Drive API | `http://localhost:3001` |

Both run together with `npm run dev:full`.

---

## ✅ Backend is Running

The Express server at `http://localhost:3001` is live. BUT to actually upload to Google Drive, you need to set your credentials in `server/.env`.

---

## 🔑 One-Time Google Drive Setup (5 min)

### Step 1 — Create a Google Cloud Project
1. Go to → **https://console.cloud.google.com**
2. Click **"New Project"** → give it any name → Create

### Step 2 — Enable Google Drive API
1. In the project, go to **APIs & Services → Library**
2. Search **"Google Drive API"** → Click it → Click **"Enable"**

### Step 3 — Create a Service Account
1. Go to **IAM & Admin → Service Accounts → + Create Service Account**
2. Give it a name (e.g. `aew-upload-bot`) → Click Create
3. Skip the optional steps → Click Done

### Step 4 — Download the JSON Key
1. Click on the service account you just created
2. Go to **"Keys" tab → Add Key → Create new key → JSON**
3. A `.json` file will download to your computer — **open it**

### Step 5 — Fill in `server/.env`
Open `server/.env` and paste from the downloaded JSON:

```env
GOOGLE_CLIENT_EMAIL=aew-upload-bot@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nABC123...\n-----END RSA PRIVATE KEY-----\n"
```

> ⚠️ Replace all `\n` in the private key with literal `\n` — copy it exactly as shown in the JSON file.

### Step 6 — Set Up the Drive Folder
1. Open **Google Drive** → Create a new folder (e.g. `AEW Lectures`)
2. Right-click the folder → **"Share"**
3. Paste the **service account email** from Step 4 → Set role to **Editor** → Share
4. Open the folder → look at the URL: `drive.google.com/drive/folders/`**`THIS_PART`**
5. Copy that folder ID → paste into `server/.env`:

```env
GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQ_yourFolderIdHere
```

### Step 7 — Restart the Server
```bash
npm run dev:full
```

The console will now show:
```
🚀 AEW Upload Server running on http://localhost:3001
📂 Google Drive: ✅ Configured
📁 Folder ID  : 1AbCdEfGhIjKlMnOpQ...
```

---

## How It Works After Setup

1. Teacher clicks **"☁️ Upload to Google Drive"** in the lecture modal
2. File streams to `POST http://localhost:3001/api/upload`
3. Backend uploads to your Drive folder using the service account
4. File is made **publicly readable** automatically
5. Real Drive link (`https://drive.google.com/file/d/REAL_ID/view`) is returned
6. Link is saved to the lecture record and is **permanently accessible**

# VPS Disk-Based Image Storage — Implementation Plan

> **Stack:** Node.js + Express + MongoDB + Nginx | **Cost:** $0 | **Storage:** VPS local disk

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Folder Structure](#2-folder-structure)
3. [VPS Setup & Permissions](#3-vps-setup--permissions)
4. [Multer Configuration (Upload Middleware)](#4-multer-configuration-upload-middleware)
5. [Sharp — Image Processing Pipeline](#5-sharp--image-processing-pipeline)
6. [Upload API Route](#6-upload-api-route)
7. [Serving Files via Nginx](#7-serving-files-via-nginx)
8. [MongoDB Schema Changes](#8-mongodb-schema-changes)
9. [Frontend Integration](#9-frontend-integration)
10. [Security Hardening](#10-security-hardening)
11. [Disk Management & Cleanup](#11-disk-management--cleanup)
12. [Backup Strategy](#12-backup-strategy)
13. [Monitoring & Alerts](#13-monitoring--alerts)
14. [Scalability Path](#14-scalability-path)
15. [Rollout Checklist](#15-rollout-checklist)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                        CLIENT                              │
│   React/Next.js → multipart/form-data POST /api/upload     │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                     NGINX (Reverse Proxy)                  │
│  • Forwards /api/* → Express (port 5000)                   │
│  • Serves  /uploads/* directly from disk (no Express hit)  │
│  • 30-day browser cache headers                            │
│  • gzip/brotli compression                                 │
└────────────┬─────────────────────────┬──────────────────────┘
             │                         │
             ▼                         ▼
┌────────────────────┐     ┌──────────────────────────────┐
│   Express API      │     │   VPS Disk                   │
│                    │     │                              │
│  POST /api/upload  │     │  /var/www/safar/             │
│  • Auth middleware │────▶│    uploads/                  │
│  • Multer (buffer) │     │      avatars/                │
│  • Sharp resize    │     │        {uuid}.webp           │
│  • Save to disk    │     │      posts/                  │
│  • Return URL      │     │        {uuid}.webp           │
└────────┬───────────┘     └──────────────────────────────┘
         │
         ▼
┌────────────────────┐
│     MongoDB        │
│  User.avatar:      │
│  "/uploads/        │
│   avatars/abc.webp"│
└────────────────────┘
```

**Key Principles:**
- Nginx serves static files — Express is never hit for image reads
- Images are always converted to **WebP** (smallest format, universally supported)
- MongoDB stores only a **path string** — never binary data
- Every upload gets a **UUID filename** — no collisions, no guessable names
- Old files are **deleted on replacement** — no orphaned storage waste

---

## 2. Folder Structure

```
/var/www/safar/                    ← project root on VPS
├── uploads/                       ← served by Nginx at /uploads/
│   ├── avatars/                   ← user profile pictures
│   └── posts/                     ← post/trip images
├── backend/
│   ├── middleware/
│   │   └── upload.js              ← multer + sharp pipeline
│   ├── routes/
│   │   └── upload.js              ← POST /api/upload
│   ├── utils/
│   │   └── fileHelper.js          ← delete old file helper
│   └── server.js
```

---

## 3. VPS Setup & Permissions

Run these once on your VPS as root or sudo user:

```bash
# 1. Create upload directories
mkdir -p /var/www/safar/uploads/avatars
mkdir -p /var/www/safar/uploads/posts

# 2. Set ownership to the user running Node.js (commonly 'ubuntu' or 'www-data')
chown -R ubuntu:ubuntu /var/www/safar/uploads

# 3. Set correct permissions
#    755 = owner can read/write/execute, others can read/execute (serve files)
chmod -R 755 /var/www/safar/uploads

# 4. Install Sharp dependencies (native module, needs libvips)
apt-get install -y libvips-dev

# 5. Install Node packages
npm install multer sharp uuid
```

---

## 4. Multer Configuration (Upload Middleware)

> **Why memory storage?** We use `memoryStorage` so Sharp can process the buffer *before* writing to disk. This prevents storing unoptimized originals even temporarily.

```js
// backend/middleware/upload.js

const multer = require('multer');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

// --- Constants ---
const UPLOAD_BASE = '/var/www/safar/uploads';

const CONFIGS = {
  avatar: {
    dir    : path.join(UPLOAD_BASE, 'avatars'),
    width  : 256,
    height : 256,
    quality: 80,
  },
  post: {
    dir    : path.join(UPLOAD_BASE, 'posts'),
    width  : 1200,
    height : null,   // maintain aspect ratio
    quality: 75,
  },
};

// --- Multer (buffer, not disk) ---
const multerUpload = multer({
  storage: multer.memoryStorage(),           // hold in RAM, not disk
  limits : { fileSize: 10 * 1024 * 1024 },  // 10MB raw limit before processing
  fileFilter: (_req, file, cb) => {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF files are allowed'), false);
    }
  },
});

// --- Sharp Processing + Save to Disk ---
const processAndSave = (type) => async (req, _res, next) => {
  if (!req.file) return next();

  const config   = CONFIGS[type];
  const filename = `${uuidv4()}.webp`;            // always webp output
  const filepath = path.join(config.dir, filename);
  const urlPath  = `/uploads/${type}s/${filename}`; // stored in MongoDB

  try {
    let sharpInstance = sharp(req.file.buffer);

    // Resize: cover crop for avatars, width-only for posts
    if (config.height) {
      sharpInstance = sharpInstance.resize(config.width, config.height, {
        fit     : 'cover',
        position: 'centre',
      });
    } else {
      sharpInstance = sharpInstance.resize(config.width, null, {
        withoutEnlargement: true,   // never upscale
      });
    }

    await sharpInstance
      .webp({ quality: config.quality })
      .toFile(filepath);

    // Attach processed file info to request for the route to use
    req.processedFile = {
      filename,
      filepath,
      urlPath,
    };

    next();
  } catch (err) {
    next(err);
  }
};

// --- Exported Middleware Chains ---
module.exports = {
  uploadAvatar : [multerUpload.single('avatar'), processAndSave('avatar')],
  uploadPost   : [multerUpload.single('image'),  processAndSave('post')],
};
```

---

## 5. Sharp — Image Processing Pipeline

| Setting | Avatar | Post Image |
|---|---|---|
| **Output Format** | WebP | WebP |
| **Max Dimensions** | 256×256px | 1200px wide |
| **Resize Mode** | Cover + centre crop | Width-only, aspect preserved |
| **Quality** | 80% | 75% |
| **Upscaling** | Disallowed | Disallowed |
| **Approximate Output Size** | ~15–30 KB | ~80–200 KB |

WebP over JPEG/PNG because:
- ~30% smaller than JPEG at same quality
- Supports transparency (replaces PNG too)
- Supported by all modern browsers (99%+)

---

## 6. Upload API Route

```js
// backend/utils/fileHelper.js

const fs   = require('fs');
const path = require('path');

const UPLOAD_BASE = '/var/www/safar/uploads';

/**
 * Deletes the old file from disk when a user replaces their image.
 * @param {string} oldUrlPath - e.g. "/uploads/avatars/abc.webp"
 */
const deleteOldFile = (oldUrlPath) => {
  if (!oldUrlPath) return;

  // Strip leading slash and resolve to absolute path
  const relativePath = oldUrlPath.replace(/^\//, '');
  const absolutePath = path.join('/var/www/safar', relativePath);

  // Safety check: only delete from within uploads directory
  if (!absolutePath.startsWith(UPLOAD_BASE)) return;

  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`[fileHelper] Failed to delete ${absolutePath}:`, err.message);
    }
  });
};

module.exports = { deleteOldFile };
```

```js
// backend/routes/upload.js

const express          = require('express');
const router           = express.Router();
const { uploadAvatar } = require('../middleware/upload');
const { deleteOldFile} = require('../utils/fileHelper');
const User             = require('../models/User');
const authMiddleware   = require('../middleware/auth');   // your existing JWT guard

// POST /api/upload/avatar
router.post('/avatar', authMiddleware, uploadAvatar, async (req, res) => {
  try {
    if (!req.processedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id).select('avatar');

    // Delete the old avatar from disk before saving the new one
    deleteOldFile(user.avatar);

    // Save only the URL path string to MongoDB
    user.avatar = req.processedFile.urlPath;
    await user.save();

    return res.status(200).json({
      message : 'Avatar updated successfully',
      url     : req.processedFile.urlPath,
      fullUrl : `${process.env.BASE_URL}${req.processedFile.urlPath}`,
    });
  } catch (err) {
    console.error('[upload/avatar]', err.message);
    return res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

module.exports = router;
```

```js
// backend/server.js — register the route

const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);
```

---

## 7. Serving Files via Nginx

Edit your site config — usually at `/etc/nginx/sites-available/safar`:

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name yourdomain.com;

    # --- SSL certs (Let's Encrypt) ---
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # -------------------------------------------------------
    # STATIC FILE SERVING — Nginx handles this, Express never
    # sees these requests. Fastest possible delivery.
    # -------------------------------------------------------
    location /uploads/ {
        alias /var/www/safar/uploads/;

        # Browser caches images for 30 days
        expires 30d;
        add_header Cache-Control "public, immutable";

        # Security: prevent directory listing
        autoindex off;

        # Only allow image file extensions
        location ~* \.(jpg|jpeg|png|webp|gif)$ {
            try_files $uri =404;
        }

        # Block all other files (php, sh, etc.) — security
        location ~* \.(php|sh|py|rb|pl)$ {
            return 403;
        }
    }

    # -------------------------------------------------------
    # API — Proxied to Express
    # -------------------------------------------------------
    location /api/ {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;

        # Upload size limit (match your multer limit)
        client_max_body_size 10M;
    }
}
```

Apply changes:

```bash
sudo nginx -t             # test — must say "syntax is ok"
sudo systemctl reload nginx
```

---

## 8. MongoDB Schema Changes

```js
// models/User.js — relevant fields only

const UserSchema = new mongoose.Schema({
  // Before: avatar: { type: String }  ← was storing base64 blob here
  // After:
  avatar: {
    type   : String,
    default: null,
    // Stores: "/uploads/avatars/550e8400-e29b-41d4-a716-446655440000.webp"
  },
});
```

**Migration script** — run once to clear old Base64 data:

```js
// scripts/migrateAvatars.js
// Run with: node scripts/migrateAvatars.js

const mongoose = require('mongoose');
const User     = require('../models/User');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Nullify all documents where avatar starts with "data:" (base64 indicator)
  const result = await User.updateMany(
    { avatar: { $regex: /^data:/ } },
    { $set: { avatar: null } }
  );

  console.log(`Cleared base64 avatars from ${result.modifiedCount} users`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
```

---

## 9. Frontend Integration

```jsx
// hooks/useUploadAvatar.js

import { useState } from 'react';
import axios from 'axios';

export const useUploadAvatar = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const upload = async (file) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('avatar', file);  // key must match multer field name

    try {
      const { data } = await axios.post('/api/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url; // "/uploads/avatars/abc.webp"
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { upload, loading, error };
};
```

```jsx
// components/AvatarUpload.jsx

import { useUploadAvatar } from '../hooks/useUploadAvatar';

const BASE_URL = import.meta.env.VITE_API_BASE_URL; // e.g. https://yourdomain.com

const AvatarUpload = ({ currentAvatar, onUpdate }) => {
  const { upload, loading, error } = useUploadAvatar();

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: client-side size guard before hitting the server
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Max 10MB.');
      return;
    }

    const url = await upload(file);
    if (url) onUpdate(url);
  };

  return (
    <div>
      <img
        src={currentAvatar ? `${BASE_URL}${currentAvatar}` : '/default-avatar.png'}
        alt="Profile"
        width={80}
        height={80}
        style={{ borderRadius: '50%', objectFit: 'cover' }}
      />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        disabled={loading}
      />
      {loading && <span>Uploading...</span>}
      {error   && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
};

export default AvatarUpload;
```

---

## 10. Security Hardening

### Never trust the client's file extension
- Multer `fileFilter` checks `mimetype` (set by the OS/browser)
- Sharp re-encodes to WebP regardless — even if someone uploads a disguised file, Sharp will fail to parse it and throw before it reaches disk

### Prevent path traversal attacks
```js
// In fileHelper.js — already included above
if (!absolutePath.startsWith(UPLOAD_BASE)) return; // prevents ../../etc/passwd tricks
```

### Rate limit the upload endpoint
```js
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs : 15 * 60 * 1000, // 15 minutes
  max      : 10,              // max 10 uploads per IP per 15 min
  message  : { error: 'Too many uploads. Please wait 15 minutes.' },
});

router.post('/avatar', authMiddleware, uploadLimiter, uploadAvatar, async (req, res) => { ... });
```

### Nginx blocks script execution in uploads
Already included in the Nginx config above — `.php`, `.sh`, `.py` etc. return 403.

### Environment variable for base URL
```env
# .env
BASE_URL=https://yourdomain.com
```

---

## 11. Disk Management & Cleanup

### Check disk usage anytime
```bash
df -h                                      # overall VPS disk
du -sh /var/www/safar/uploads/*            # per category
du -sh /var/www/safar/uploads/avatars/     # avatars specifically
```

### Cron job — delete orphaned files not referenced in DB
```js
// scripts/cleanOrphanedUploads.js
// Schedule: cron  0 3 * * 0  (every Sunday 3am)

const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const User     = require('../models/User');
require('dotenv').config();

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);

  const avatarDir = '/var/www/safar/uploads/avatars';
  const files     = fs.readdirSync(avatarDir);

  // Get all avatar paths currently stored in DB
  const users       = await User.find({ avatar: { $ne: null } }).select('avatar');
  const dbFilenames = new Set(users.map(u => path.basename(u.avatar)));

  let deleted = 0;
  for (const file of files) {
    if (!dbFilenames.has(file)) {
      fs.unlinkSync(path.join(avatarDir, file));
      deleted++;
    }
  }

  console.log(`Orphan cleanup: removed ${deleted} files`);
  await mongoose.disconnect();
}

clean().catch(console.error);
```

Add to crontab:
```bash
crontab -e
# Add:
0 3 * * 0 node /var/www/safar/backend/scripts/cleanOrphanedUploads.js >> /var/log/safar-cleanup.log 2>&1
```

---

## 12. Backup Strategy

Since files now live on disk (not in MongoDB), backups need to cover both:

### Option A — rsync to another server (free)
```bash
# Daily backup of uploads folder to a backup server / another cheap VPS
rsync -avz --delete /var/www/safar/uploads/ backup-user@backup-server-ip:/backups/safar/uploads/
```

### Option B — tar + Backblaze B2 (free tier: 10GB)
```bash
# Compress uploads and push to free Backblaze B2 bucket
tar -czf /tmp/uploads-$(date +%F).tar.gz /var/www/safar/uploads/
b2 upload-file my-safar-bucket /tmp/uploads-$(date +%F).tar.gz uploads-$(date +%F).tar.gz
rm /tmp/uploads-$(date +%F).tar.gz
```

> MongoDB continues to be backed up with `mongodump` separately as usual.

---

## 13. Monitoring & Alerts

### Disk usage alert script
```bash
#!/bin/bash
# /usr/local/bin/disk-alert.sh
# Alert when disk usage exceeds 80%

USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
THRESHOLD=80

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "ALERT: VPS disk at ${USAGE}% on $(hostname) at $(date)" \
  | mail -s "Disk Alert - Safar VPS" your@email.com
fi
```

```bash
chmod +x /usr/local/bin/disk-alert.sh
crontab -e
# Add:
0 */6 * * * /usr/local/bin/disk-alert.sh    # check every 6 hours
```

---

## 14. Scalability Path

This setup scales in clear stages — no rewrite needed, just swap the storage layer:

```
Stage 1 (Now)          Stage 2 (~10k users)       Stage 3 (large scale)
─────────────          ────────────────────        ──────────────────────
VPS Disk               Backblaze B2               AWS S3 / Cloudflare R2
+ Nginx static  ────▶  + Cloudflare CDN    ────▶  + CloudFront CDN
$0 cost                ~$3/month                   Pay as you go
```

**The key:** Your API routes and MongoDB schema don't change between stages. You only swap where `processAndSave` writes the file and what URL it returns. The rest of the app is oblivious.

---

## 15. Rollout Checklist

```
PRE-DEPLOYMENT
  ☐ npm install multer sharp uuid
  ☐ mkdir -p /var/www/safar/uploads/{avatars,posts}
  ☐ chown + chmod permissions set correctly
  ☐ BASE_URL added to .env on VPS
  ☐ Nginx config updated and nginx -t passes
  ☐ Upload rate limiter installed (express-rate-limit)

DEPLOYMENT
  ☐ Deploy new backend code
  ☐ sudo systemctl reload nginx
  ☐ Test avatar upload via Postman or frontend
  ☐ Confirm file appears at https://yourdomain.com/uploads/avatars/xxx.webp
  ☐ Confirm MongoDB stores path string (not base64)
  ☐ Confirm old file is deleted when avatar is replaced

POST-DEPLOYMENT
  ☐ Run migrateAvatars.js to clear old base64 data from DB
  ☐ Verify MongoDB document sizes dropped significantly
  ☐ Set up orphan cleanup cron job
  ☐ Set up disk usage alert cron job
  ☐ Test disk usage: df -h
```

---

*Last updated: March 2026 | Stack: Node.js 20 + Express 4 + MongoDB 7 + Nginx 1.24*

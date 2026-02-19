# Android Backend — Installation Guide

All files in this folder are ready to drop into your live SAFAR server when you want to enable Android app support.

---

## New Files to Add

Copy these into your live server at the same relative paths:

| File in this folder | Copy to |
|---|---|
| `server/utils/jwt.ts` | `server/utils/jwt.ts` |
| `server/utils/fcm.ts` | `server/utils/fcm.ts` |
| `server/routes/mobile-auth.ts` | `server/routes/mobile-auth.ts` |
| `server/routes/devices.ts` | `server/routes/devices.ts` |
| `server/routes/mobile-upload.ts` | `server/routes/mobile-upload.ts` |

---

## Changes Needed in Existing Files

### 1. `server/middleware/auth.ts`
Add this at the top (after the existing import), and paste the new `requireAuthMobile` export:
```typescript
import { verifyAccessToken } from '../utils/jwt';

export const requireAuthMobile = (req, res, next) => {
    if (req.session?.userId) return next();
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = verifyAccessToken(token);
            (req.session as any).userId = payload.userId;
            return next();
        } catch {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
    }
    return res.status(401).json({ message: 'Unauthorized' });
};
```

### 2. `server/routes/auth.ts`
Add near the top (after existing imports):
```typescript
import { signAccessToken, signRefreshToken, hashRefreshToken } from '../utils/jwt';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function issueTokenPair(userId: string) {
    const accessToken = signAccessToken(userId);
    const refreshToken = signRefreshToken(userId);
    await collections.refreshTokens().insertOne({
        id: uuidv4(), user_id: userId,
        token_hash: hashRefreshToken(refreshToken),
        expires_at: new Date(Date.now() + REFRESH_TTL_MS),
        created_at: new Date(),
    });
    return { accessToken, refreshToken };
}
```

In the **login** handler, just before `res.json(...)`:
```typescript
let tokens = null;
try { tokens = await issueTokenPair(authenticatedUser.id); } catch {}
// Then spread into res.json: { ...existingFields, ...(tokens ?? {}) }
```

Same thing in the **signup** handler just before `res.status(201).json(...)`.

### 3. `server/db.ts`
In the `collections` object, add:
```typescript
refreshTokens: () => getDb().collection('refresh_tokens'),
deviceTokens: () => getDb().collection('device_tokens'),
```

In `initDatabase()`, add:
```typescript
await db.collection('refresh_tokens').createIndex({ token_hash: 1 }, { unique: true });
await db.collection('refresh_tokens').createIndex({ user_id: 1 });
await db.collection('refresh_tokens').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
await db.collection('device_tokens').createIndex({ user_id: 1, device_id: 1 }, { unique: true });
await db.collection('device_tokens').createIndex({ fcm_token: 1 });
```

### 4. `server/index.ts`
Add imports:
```typescript
import { mobileAuthRoutes } from "./routes/mobile-auth";
import { devicesRoutes } from "./routes/devices";
import { mobileUploadRoutes } from "./routes/mobile-upload";
```

Add route mounts (after existing routes):
```typescript
app.use("/api/mobile/auth", mobileAuthRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/mobile", mobileUploadRoutes);
```

---

## Environment Variables to Add to Vultr `.env`

```env
JWT_ACCESS_SECRET=<run: openssl rand -hex 64>
JWT_REFRESH_SECRET=<run: openssl rand -hex 64>
FIREBASE_SERVICE_ACCOUNT_JSON=<paste JSON from Firebase Console → Service Accounts>
```

---

## New npm Packages to Install on Server

```bash
npm install jsonwebtoken @types/jsonwebtoken multer @types/multer firebase-admin
```

---

## New API Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Now also returns `accessToken` + `refreshToken` |
| `/api/auth/signup` | POST | Same |
| `/api/mobile/auth/refresh` | POST | Get new tokens using refresh token |
| `/api/mobile/auth/logout` | POST | Revoke refresh token |
| `/api/devices/register` | POST | Save FCM token after Android login |
| `/api/devices/unregister` | DELETE | Remove FCM token on logout |
| `/api/mobile/upload` | POST | Upload image/audio as multipart binary |

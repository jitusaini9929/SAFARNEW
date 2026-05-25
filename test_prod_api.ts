import admin from 'firebase-admin';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_PROD_JSON!);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function testFromTemplate() {
  try {
    // 1. Create a custom token for a test UID
    const uid = 'test-user-' + Date.now();
    const customToken = await admin.auth().createCustomToken(uid);
    
    // 2. We need a real Firebase ID token (not custom token) to pass to the backend.
    // To do this programmatically, we can exchange the custom token using the Identity Toolkit API.
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });
    
    const verifyData = await verifyRes.json();
    const idToken = verifyData.idToken;
    
    console.log("Got ID token, length:", idToken.length);

    // 3. Make the request to the production backend
    const res = await fetch('https://safar.parmarssc.in/api/plans/from-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        templateId: 'neet-ug',
        title: 'NEET UG Test',
        autoDistribute: true
      })
    });

    const status = res.status;
    const text = await res.text();
    console.log(`STATUS: ${status}`);
    console.log(`BODY: ${text.slice(0, 500)}`);
    
  } catch (err) {
    console.error(err);
  }
}

testFromTemplate();

import fs from 'fs';

const AGENT_URL = 'https://safar-production-0a86.up.railway.app/api/syllabus/import';
const filePath = 'd:\\SAFAR_PARENT\\SAFAR\\Extras\\Syllabu.pdf';
const fileBuffer = fs.readFileSync(filePath);

async function test() {
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' }),
    'Syllabu.pdf',
  );

  const response = await fetch(AGENT_URL, { method: 'POST', body: formData });
  const payload = await response.json();
  
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] Status: ${response.status}, Success: ${payload.success}, Errors: ${payload.errors?.length || 0}`);
  if (!payload.success && payload.errors) {
    payload.errors.forEach(e => console.log(`  ${e}`));
  }
  return payload.success;
}

// Try every 30 seconds until success
for (let i = 0; i < 10; i++) {
  try {
    const ok = await test();
    if (ok) {
      console.log('\n✅ RAILWAY DEPLOYMENT UPDATED - Import working!');
      process.exit(0);
    }
  } catch (e) {
    console.log(`[${new Date().toLocaleTimeString()}] Error: ${e.message}`);
  }
  if (i < 9) {
    console.log('Waiting 30s for Railway to redeploy...\n');
    await new Promise(r => setTimeout(r, 30000));
  }
}
console.log('\n❌ Railway did not redeploy in time.');

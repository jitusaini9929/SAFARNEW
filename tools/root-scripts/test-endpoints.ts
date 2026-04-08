
import 'dotenv/config';

async function testEndpoints() {
    const email = "thatkindchic@gmail.com";
    console.log(`Testing /check-email for ${email}...`);

    try {
        const res = await fetch("http://localhost:8080/api/auth/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        console.log("/check-email status:", res.status);
        const json = await res.json();
        console.log("/check-email result:", json);
    } catch (e) {
        console.error("/check-email failed:", e);
    }
}

testEndpoints();

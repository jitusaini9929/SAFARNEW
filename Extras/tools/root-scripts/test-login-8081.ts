import 'dotenv/config';

async function testLogin() {
    const email = "thatkindchic@gmail.com";
    const password = "ANJ123";

    console.log(`Testing login on port 8081 for ${email}...`);

    try {
        const res = await fetch("http://localhost:8081/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        console.log("Response Status:", res.status);
        const data = await res.text();
        console.log("Response Body:", data);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testLogin();

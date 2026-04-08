
import 'dotenv/config';

async function debugLogin() {
    const email = "thatkindchic@gmail.com";
    const password = "password123"; // I'll assume they might have used a generic one or the previous one ANJ123. The user didn't specify the password in the latest prompt but used ANJ123 before.
    // However, I can't know the password for sure if they just registered.
    // But the user said "when i registr ... again".
    // I will try with "ANJ123" as per previous context.

    console.log(`Attempting login for ${email}...`);

    try {
        const res = await fetch("http://localhost:8080/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: "ANJ123"
            })
        });

        console.log("Response Status:", res.status);
        const text = await res.text();
        console.log("Response Body:", text);

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

debugLogin();

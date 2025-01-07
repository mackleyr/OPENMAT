// src/services/twilioClient.js

export async function sendVerificationCode(phoneNumber) {
    // We'll post to Netlify's serverless function with mode = 'start'
    const res = await fetch("/.netlify/functions/twilioVerify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "start", phone: phoneNumber }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || "Failed to send verification code");
    }
    return data; // { success: true, message: "Code sent" }
  }
  
  export async function checkVerificationCode(phoneNumber, code) {
    // We'll post with mode = 'check'
    const res = await fetch("/.netlify/functions/twilioVerify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "check", phone: phoneNumber, code }),
    });
    const data = await res.json();
    if (!data.success) {
      // code incorrect
      return false;
    }
    return true; // verified
  }
  
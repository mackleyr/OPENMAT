// src/services/twilioClient.js

export async function sendVerificationCode(phoneNumber) {
  // We'll post to your Vercel route => /api/twilioVerify
  // with { mode: "start", phone: phoneNumber }
  const res = await fetch("/api/twilioVerify", {
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
  // We'll post to /api/twilioVerify with { mode: "check", phone, code }
  const res = await fetch("/api/twilioVerify", {
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

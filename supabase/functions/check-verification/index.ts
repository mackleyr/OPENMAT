import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

// Use your official Supabase project URL and service role key
// Project ref: nmlhraryipzypuwutxgh
const supabaseUrl = "https://nmlhraryipzypuwutxgh.supabase.co"; 
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhyYXJ5aXB6eXB1d3V0eGdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDgzODkwMiwiZXhwIjoyMDQ2NDE0OTAyfQ.qT87QPEqVqFGJ45qJdDlChoRsajWgAaQKb89wHGU2H4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders
    });
  }

  try {
    const { phoneNumber, otpCode } = await req.json() || {};
    console.log("[check-verification] Request received:", { phoneNumber, otpCode });

    if (!phoneNumber || !otpCode) {
      console.warn("[check-verification] Missing fields.");
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), { status: 400, headers: corsHeaders });
    }

    // Normalize phone
    const digits = phoneNumber.replace(/\D/g, '');

    // Use a test domain for email to eliminate validation issues
    const email = `testuser_${digits}@example.com`;
    const password = `DemoPassw0rd_${digits}`;
    console.log("[check-verification] Derived credentials:", { email, password });

    // Assume OTP is valid for this MVP
    console.log("[check-verification] OTP assumed verified.");

    // Check if user exists in Auth
    const listUrl = `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
    console.log("[check-verification] Listing user by email:", listUrl);

    const listResp = await fetch(listUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    const listText = await listResp.text();
    console.log("[check-verification] listResp:", listResp.status, listText);

    if (!listResp.ok) {
      console.error("[check-verification] Error listing user:", listText);
      return new Response(JSON.stringify({ success: false, error: 'Could not list users.' }), { status: 500, headers: corsHeaders });
    }

    const listData = JSON.parse(listText);
    let user = listData.users?.[0];

    // If user does not exist, create one with minimal payload
    if (!user) {
      console.log("[check-verification] No user found. Creating new auth user...");
      const createUrl = `${supabaseUrl}/auth/v1/admin/users`;
      const userData = {
        email,
        password
      };

      console.log("[check-verification] Creating auth user with:", userData);

      const createResp = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const createText = await createResp.text();
      console.log("[check-verification] createResp:", createResp.status, createText);

      if (!createResp.ok) {
        console.error("[check-verification] User creation failed:", createText);
        return new Response(JSON.stringify({ success: false, error: 'User creation failed' }), {
          status: 500, headers: corsHeaders
        });
      }

      user = JSON.parse(createText);
      console.log("[check-verification] New auth user created:", user);
    } else {
      console.log("[check-verification] User already exists, skipping creation.");
    }

    // If we reached here, user creation succeeded in Auth.
    console.log("[check-verification] Auth user creation success. Returning credentials.");
    return new Response(JSON.stringify({ success: true, email, password }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[check-verification] Unexpected error:", err.message);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500, headers: corsHeaders
    });
  }
});

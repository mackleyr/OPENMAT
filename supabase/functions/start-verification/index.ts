// supabase/functions/start-verification/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json',
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }

  const { phoneNumber } = await req.json() || {}
  if (!phoneNumber) {
    return new Response(JSON.stringify({ error: 'Missing phoneNumber' }), {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }

  const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')

  const headers = { 'Access-Control-Allow-Origin': '*' }

  if (!serviceSid || !accountSid || !authToken) {
    console.error('Missing Twilio env vars.')
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }

  const auth = btoa(`${accountSid}:${authToken}`)
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: new URLSearchParams({ To: phoneNumber, Channel: 'sms' })
    })

    if (!response.ok) {
      console.error('Twilio Start Verification Error:', await response.text())
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  } catch (err) {
    console.error('Twilio request failed:', err)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers })
  }
})

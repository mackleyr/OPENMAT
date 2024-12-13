// supabase/functions/check-verification/index.ts

import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://deno.land/x/supabase@1.3.1/mod.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
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
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

  console.log('check-verification: Received request for phoneNumber:', phoneNumber);

  // If no phone number is provided, proceed but note it
  if (!phoneNumber) {
    console.warn('check-verification: No phoneNumber provided. Will continue with user creation logic.');
  }

  // Retrieve environment variables
  const supabaseUrl = Deno.env.get('PROJECT_SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

  // If environment variables are missing, return error
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing PROJECT_SUPABASE_URL or SERVICE_ROLE_KEY. Cannot proceed with user creation.');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const digits = (phoneNumber || '').replace(/\D/g, '')
  const formattedPhone = digits.length === 10 ? `+1${digits}` : `+${digits}`

  const KNOWN_EMAIL = "mvpuser@and.deals"
  const KNOWN_PASSWORD = "DemoPassw0rd_12345!"

  console.log(`check-verification: Normalized phone to: ${formattedPhone}`);

  // Check if user already exists
  const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    email: KNOWN_EMAIL
  })

  if (listErr) {
    console.error('Error listing users by email:', listErr);
    return new Response(JSON.stringify({ error: 'Could not list existing users.' }), {
      status: 500,
      headers
    })
  }

  let user = userList.users[0]

  if (!user) {
    console.log('check-verification: No existing user found. Creating new user...');
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: KNOWN_EMAIL,
      email_confirmed_at: new Date().toISOString(),
      phone: formattedPhone || "",
      phone_confirmed_at: formattedPhone ? new Date().toISOString() : null,
      password: KNOWN_PASSWORD
    })

    if (createErr || !newUser?.user) {
      console.error('Error creating user:', createErr);
      return new Response(JSON.stringify({ error: 'Could not create user.' }), {
        status: 500,
        headers
      })
    }

    user = newUser.user
    console.log('check-verification: New user created:', user)
  } else {
    console.log('check-verification: Existing user found. Updating user info...');
    const { data: updatedUser, error: updateErr } = await supabaseAdmin.auth.admin.updateUser(
      user.id,
      {
        email: KNOWN_EMAIL,
        email_confirmed_at: new Date().toISOString(),
        password: KNOWN_PASSWORD,
        phone: formattedPhone || "",
        phone_confirmed_at: formattedPhone ? new Date().toISOString() : null,
      }
    )

    if (updateErr || !updatedUser?.user) {
      console.error('Error updating user:', updateErr);
      return new Response(JSON.stringify({ error: 'Could not update user.' }), {
        status: 500,
        headers
      })
    }

    user = updatedUser.user
    console.log('check-verification: User updated:', user)
  }

  console.log(`User ensured for ${formattedPhone}. Now has stable email/password for direct sign-in.`);

  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
})

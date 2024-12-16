import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { phoneNumber } = await req.json() || {};
    console.log('check-verification: Received phoneNumber:', phoneNumber);

    const supabaseUrl = Deno.env.get('PROJECT_SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing PROJECT_SUPABASE_URL or SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const digits = (phoneNumber || '').replace(/\D/g, '');
    const formattedPhone = digits.length === 10 ? `+1${digits}` : `+${digits}`;

    // Unique email and password per phone number
    const email = `${digits}@and.deals`;
    const password = `DemoPassw0rd_${digits}`;

    console.log(`Normalized phone: ${formattedPhone}, email: ${email}, password: ${password}`);

    // List user by email
    const listResp = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listResp.ok) {
      const listErr = await listResp.text();
      console.error('Error listing user by email:', listErr);
      return new Response(JSON.stringify({ error: 'Could not list users.' }), { status: 500, headers: corsHeaders });
    }

    const userList = await listResp.json();
    let user = userList.users?.[0];

    const userData = {
      email: email,
      email_confirm: true, // Confirms email directly
      password: password,
      phone: formattedPhone || "",
      phone_confirmed_at: formattedPhone ? new Date().toISOString() : null
    };

    if (!user) {
      console.log('No existing user, creating new one...');
      const createResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const createBody = await createResp.text();
      console.log('Create user response body:', createBody);

      if (!createResp.ok) {
        console.error('Error creating user:', createBody);
        return new Response(JSON.stringify({ error: 'User creation failed.' }), { status: 500, headers: corsHeaders });
      }

      const createJson = JSON.parse(createBody);
      user = createJson.user;
      console.log('New user created:', user);
    } else {
      console.log('User found, updating...');
      const updateResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const updateBody = await updateResp.text();
      console.log('Update user response body:', updateBody);

      if (!updateResp.ok) {
        console.error('Error updating user:', updateBody);
        return new Response(JSON.stringify({ error: 'User update failed.' }), { status: 500, headers: corsHeaders });
      }

      const updateJson = JSON.parse(updateBody);
      user = updateJson.user;
      console.log('User updated:', user);
    }

    console.log(`User ensured for ${formattedPhone}, email confirmed. Email: ${email}`);

    // Return email and password so frontend can sign in
    return new Response(JSON.stringify({ success: true, email, password }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('check-verification unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected error occurred.' }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

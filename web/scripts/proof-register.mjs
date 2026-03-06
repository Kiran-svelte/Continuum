import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function required(name, value) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const url = required('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl);
const anon = required('NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey);
const service = required('SUPABASE_SERVICE_ROLE_KEY', supabaseServiceKey);

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const client = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `dev.proof.${Date.now()}@example.com`;
const password = 'Password123!';

const registerPayload = {
  first_name: 'Dev',
  last_name: 'Proof',
  company_name: `DevCo Proof ${Date.now()}`,
  timezone: 'Asia/Kolkata',
};

async function main() {
  const createUser = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createUser.error) {
    console.log(JSON.stringify({ step: 'createUser', ok: false, error: { message: createUser.error.message, status: createUser.error.status } }, null, 2));
    process.exit(1);
  }

  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session?.access_token) {
    console.log(JSON.stringify({ step: 'signIn', ok: false, error: signIn.error ? { message: signIn.error.message, status: signIn.error.status } : { message: 'No session' } }, null, 2));
    process.exit(1);
  }

  const token = signIn.data.session.access_token;

  const res = await fetch('http://127.0.0.1:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(registerPayload),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  console.log(
    JSON.stringify(
      {
        step: 'register',
        email,
        status: res.status,
        ok: res.ok,
        response: json ?? text,
      },
      null,
      2
    )
  );

  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ step: 'exception', error: e?.message ?? String(e) }, null, 2));
  process.exit(1);
});

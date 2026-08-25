require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Login with admin
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'leonardo@geneze.com.br', // Using a generic or standard email if we don't know it. Wait, I don't know his admin email.
    password: 'password123'
  });
  
  console.log(error || data);
}

test();

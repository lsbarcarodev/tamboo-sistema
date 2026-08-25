const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const hostname = supabaseUrl.replace('https://', '');
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.rMxky610PthtUrp4Z6FoL9NhaufLv3EdwpIxISRPNn4';

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    const options = {
      hostname,
      port: 443,
      path: '/pg/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const SQL = `
-- 1. Criar a função do trigger do PostgREST
CREATE OR REPLACE FUNCTION public.pgrst_watch() 
RETURNS event_trigger 
LANGUAGE plpgsql AS $$ 
BEGIN 
    NOTIFY pgrst, 'reload schema'; 
END; 
$$;

-- 2. Criar o Event Trigger para DDL
DROP EVENT TRIGGER IF EXISTS pgrst_watch;
CREATE EVENT TRIGGER pgrst_watch ON ddl_command_end EXECUTE PROCEDURE public.pgrst_watch();

-- 3. Executar um comando DDL bobo para forçar o trigger a disparar e recarregar o cache
ALTER TABLE public.st_motoristas ADD COLUMN IF NOT EXISTS temp_check_col BOOLEAN;
ALTER TABLE public.st_motoristas DROP COLUMN IF EXISTS temp_check_col;
`;

async function run() {
  console.log('Installing DDL watch trigger to force schema reload...');
  const result = await runSQL(SQL);
  console.log('Status:', result.status);
  if (result.status >= 200 && result.status < 300) {
    console.log('✅ Event trigger installed and dummy DDL executed!');
  } else {
    console.log('Error:', result.body);
  }
}

run().catch(console.error);

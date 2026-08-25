import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.geneze.online';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.dm-dvIwTl60Y-OZ-5CjpRtDHQWBnqMs76bT6HSEtLEw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnostico() {
  console.log("=== DIAGNÓSTICO SUPABASE ===\n");

  // 1. Testar tabela st_clientes (que funciona)
  console.log("1. Testando tabela st_clientes (que sabemos funcionar)...");
  const { data: clientes, error: errClientes } = await supabase.from('st_clientes').select('*').limit(1);
  if (errClientes) {
    console.error("   ERRO st_clientes:", JSON.stringify(errClientes, null, 2));
  } else {
    console.log("   OK! st_clientes retornou:", clientes?.length, "registro(s)");
  }

  // 2. Testar tabela st_equipamentos
  console.log("\n2. Testando tabela st_equipamentos...");
  const { data: equips, error: errEquips } = await supabase.from('st_equipamentos').select('*').limit(1);
  if (errEquips) {
    console.error("   ERRO st_equipamentos:", JSON.stringify(errEquips, null, 2));
  } else {
    console.log("   OK! st_equipamentos retornou:", equips?.length, "registro(s)");
  }

  // 3. Testar acesso direto via REST API (fetch)
  console.log("\n3. Testando acesso direto via REST API...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/st_equipamentos?limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    const body = await res.text();
    console.log("   Status:", res.status, res.statusText);
    console.log("   Body:", body.substring(0, 500));
  } catch (e) {
    console.error("   ERRO fetch:", e.message);
  }

  // 4. Listar todas as tabelas visíveis via RPC (se disponível)
  console.log("\n4. Tentando listar tabelas públicas via RPC...");
  const { data: tabelas, error: errTabelas } = await supabase.rpc('pg_catalog', {});
  if (errTabelas) {
    console.log("   RPC não disponível (esperado). Tentando via information_schema...");
    // Tenta via query string direta
    try {
      const res2 = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        }
      });
      const body2 = await res2.text();
      console.log("   Root API Status:", res2.status);
      // Try to extract table names from the openapi spec
      if (res2.status === 200) {
        try {
          const json = JSON.parse(body2);
          const paths = Object.keys(json.paths || {}).filter(p => p.startsWith('/'));
          console.log("   Tabelas visíveis pela API:", paths.join(', '));
        } catch {
          console.log("   Body (primeiros 1000 chars):", body2.substring(0, 1000));
        }
      }
    } catch (e) {
      console.error("   ERRO:", e.message);
    }
  }

  // 5. Verificar se a URL da API está correta
  console.log("\n5. Verificando URL do Supabase...");
  console.log("   URL:", supabaseUrl);
  try {
    const healthRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Accept': 'application/openapi+json',
      }
    });
    if (healthRes.ok) {
      const openapi = await healthRes.json();
      const definitions = Object.keys(openapi.definitions || {});
      console.log("   Tabelas no schema do PostgREST:", definitions.join(', '));
      const temEquipamentos = definitions.includes('st_equipamentos');
      console.log("   st_equipamentos está no schema?", temEquipamentos ? "SIM ✅" : "NÃO ❌");
    } else {
      console.log("   Status:", healthRes.status);
    }
  } catch (e) {
    console.error("   ERRO:", e.message);
  }

  console.log("\n=== FIM DIAGNÓSTICO ===");
}

diagnostico();

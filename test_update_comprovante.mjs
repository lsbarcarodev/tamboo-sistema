import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.geneze.online';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.dm-dvIwTl60Y-OZ-5CjpRtDHQWBnqMs76bT6HSEtLEw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
  console.log("=== TESTE DE UPDATE COM comprovante_url ===\n");

  // 1. Buscar um pedido existente para testar
  const { data: pedidos, error: fetchErr } = await supabase
    .from('st_locacoes')
    .select('id, status, comprovante_url')
    .limit(1);

  if (fetchErr) {
    console.error("Erro ao buscar pedido:", fetchErr);
    return;
  }

  console.log("Pedido encontrado:", JSON.stringify(pedidos[0], null, 2));

  const pedidoId = pedidos[0].id;

  // 2. Tentar fazer o update EXATAMENTE como o app do motorista faz
  console.log("\nTestando update com comprovante_url...");
  const { data: updateData, error: updateError } = await supabase
    .from('st_locacoes')
    .update({ 
      comprovante_url: 'https://teste.com/foto.jpg'
    })
    .eq('id', pedidoId)
    .select();

  if (updateError) {
    console.error("ERRO NO UPDATE:", JSON.stringify(updateError, null, 2));
    console.error("\nMensagem:", updateError.message);
    console.error("Código:", updateError.code);
    console.error("Detalhes:", updateError.details);
    console.error("Hint:", updateError.hint);
  } else {
    console.log("UPDATE OK! Resultado:", JSON.stringify(updateData, null, 2));
    
    // Reverter o teste
    await supabase
      .from('st_locacoes')
      .update({ comprovante_url: null })
      .eq('id', pedidoId);
    console.log("Revertido para null.");
  }

  // 3. Tentar via fetch direto (PATCH request)
  console.log("\n--- Teste direto via PATCH HTTP ---");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/st_locacoes?id=eq.${pedidoId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ comprovante_url: 'https://teste.com/foto_patch.jpg' })
    });
    const body = await res.text();
    console.log("Status:", res.status, res.statusText);
    console.log("Body:", body.substring(0, 500));
    
    // Reverter
    if (res.ok) {
      await fetch(`${supabaseUrl}/rest/v1/st_locacoes?id=eq.${pedidoId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comprovante_url: null })
      });
      console.log("Revertido.");
    }
  } catch (e) {
    console.error("ERRO fetch PATCH:", e.message);
  }

  console.log("\n=== FIM DO TESTE ===");
}

testUpdate();

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Função auxiliar para garantir que a chave seja extraída corretamente
// caso o usuário tenha colado todo o conteúdo do .env na variável por engano
function getServiceRoleKey() {
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (key.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    const match = key.match(/SUPABASE_SERVICE_ROLE_KEY=(eyJ[^\n\r]+)/);
    if (match) return match[1].trim();
  }
  return key.trim();
}

function getSupabaseUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (url.includes('NEXT_PUBLIC_SUPABASE_URL=')) {
    const match = url.match(/NEXT_PUBLIC_SUPABASE_URL=(https:\/\/[^\n\r]+)/);
    if (match) return match[1].trim();
  }
  return url.trim();
}

// Precisamos do Service Role para criar usuário ignorando bloqueios normais do front-end
const supabaseAdmin = createClient(
  getSupabaseUrl(),
  getServiceRoleKey()
);

export async function POST(request: Request) {
  try {
    const { sessionId, email, password, companyName } = await request.json();

    if (!sessionId || !email || !password || !companyName) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 1. Verifica se a sessão do Stripe realmente existe e foi paga
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Pagamento não confirmado' }, { status: 403 });
    }

    // 2. Cria o usuário no Supabase
    // Como usamos o admin.createUser, ele já nasce confirmado e com a senha correta
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        companyName,
      }
    });

    if (userError) {
      console.error('Erro ao criar usuário:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 3. Atualiza a tabela st_empresas com os dados do Stripe
    // (Opcional, pois a trigger on_auth_user_created_empresa já cria a empresa limpa)
    // Se quisermos, podemos fazer um update para injetar o stripe_customer_id na empresa criada pela trigger

    return NextResponse.json({ success: true, user: userData.user });
  } catch (error: any) {
    console.error('Erro no onboarding:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

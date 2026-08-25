import { NextResponse } from 'next/server';
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

// Inicializa o cliente admin com a chave service role
const supabaseAdmin = createClient(
  getSupabaseUrl(),
  getServiceRoleKey()
);

export async function POST(request: Request) {
  try {
    // 1. Validar autorização do Administrador solicitante
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);

    if (adminError || !adminUser) {
      return NextResponse.json({ error: `Sessão inválida ou expirada (${adminError?.message || 'Token não encontrado'})` }, { status: 401 });
    }

    // 2. Buscar a empresa do administrador
    const { data: adminVinculo, error: vinculoError } = await supabaseAdmin
      .from('st_usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .single();

    if (vinculoError || !adminVinculo) {
      return NextResponse.json({ error: 'Administrador não vinculado a nenhuma empresa' }, { status: 403 });
    }

    const empresaId = adminVinculo.empresa_id;

    // 3. Receber dados do motorista
    const { nome, telefone, email } = await request.json();

    if (!nome || !telefone || !email) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios (Nome, Telefone e E-mail)' }, { status: 400 });
    }

    const generatedEmail = email.toLowerCase().trim();
    const generatedPassword = `Tamboo@${generatedEmail}`;

    // 5. Verificar se o motorista já existe no sistema global (por email ou telefone)
    let driverUserId = null;
    const { data: driverExists } = await supabaseAdmin
      .from('st_motoristas')
      .select('user_id')
      .eq('telefone', telefone)
      .limit(1)
      .maybeSingle();

    if (driverExists && driverExists.user_id) {
      driverUserId = driverExists.user_id;
    } else {
      // Cria novo login no auth.users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: generatedEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          role: 'motorista',
          nome,
          telefone
        }
      });

      if (authError) {
        return NextResponse.json({ error: authError.message || 'Erro ao criar usuário do motorista' }, { status: 500 });
      }
      if (authData && authData.user) {
        driverUserId = authData.user.id;
      }
    }

    if (!driverUserId) {
       return NextResponse.json({ error: 'Não foi possível obter ou criar o usuário do motorista' }, { status: 500 });
    }

    // 6. Vincular na tabela st_usuarios_empresas (para controle RLS)
    // Verifica se já existe o vínculo
    const { data: existingLink } = await supabaseAdmin
      .from('st_usuarios_empresas')
      .select('*')
      .eq('user_id', driverUserId)
      .eq('empresa_id', empresaId)
      .single();

    if (!existingLink) {
      const { error: linkError } = await supabaseAdmin
        .from('st_usuarios_empresas')
        .insert({
          user_id: driverUserId,
          empresa_id: empresaId,
          role: 'motorista'
        });

      if (linkError) {
        console.error('Erro ao vincular motorista à empresa:', linkError);
        return NextResponse.json({ error: 'Erro ao vincular motorista à empresa: ' + linkError.message }, { status: 500 });
      }
    }

    // 7. Cadastrar na tabela st_motoristas
    // Verifica se já existe na st_motoristas para essa empresa
    const { data: existingDriver } = await supabaseAdmin
      .from('st_motoristas')
      .select('*')
      .eq('user_id', driverUserId)
      .single();

    let driverData = existingDriver;

    if (!existingDriver) {
      const { data: newDriver, error: driverError } = await supabaseAdmin
        .from('st_motoristas')
        .insert({
          user_id: driverUserId,
          empresa_id: empresaId,
          nome,
          telefone
        })
        .select()
        .single();

      if (driverError) {
        console.error('Erro ao criar perfil do motorista na st_motoristas:', driverError);
        return NextResponse.json({ error: 'Erro ao criar perfil do motorista: ' + driverError.message }, { status: 500 });
      }
      driverData = newDriver;
    } else {
       // Se já existia, atualizamos os dados para o novo nome/telefone, por precaução
       const { data: updatedDriver, error: driverUpdateError } = await supabaseAdmin
        .from('st_motoristas')
        .update({
          nome,
          telefone,
          empresa_id: empresaId
        })
        .eq('id', existingDriver.id)
        .select()
        .single();

        if (driverUpdateError) {
           console.error('Erro ao atualizar perfil do motorista na st_motoristas:', driverUpdateError);
        } else {
           driverData = updatedDriver;
        }
    }

    return NextResponse.json({ success: true, motorista: driverData });

  } catch (error: any) {
    console.error('Erro ao vincular motorista:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

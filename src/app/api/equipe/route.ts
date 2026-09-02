import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper function to safely extract keys if user copied entire .env file content
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

const supabaseAdmin = createClient(
  getSupabaseUrl(),
  getServiceRoleKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper to get admin's empresa_id from token
async function getAdminEmpresa(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return { error: 'Não autorizado', status: 401 };

  const token = authHeader.replace('Bearer ', '');
  const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.getUser(token);

  if (adminError || !adminUser) {
    return { error: 'Sessão inválida ou expirada', status: 401 };
  }

  const { data: adminVinculo, error: vinculoError } = await supabaseAdmin
    .from('st_usuarios_empresas')
    .select('empresa_id')
    .eq('user_id', adminUser.id)
    .eq('role', 'admin')
    .single();

  if (vinculoError || !adminVinculo) {
    return { error: 'Administrador não vinculado a nenhuma empresa', status: 403 };
  }

  return { empresaId: adminVinculo.empresa_id, adminUser };
}

export async function GET(req: Request) {
  try {
    const adminData = await getAdminEmpresa(req);
    if (adminData.error) {
      return NextResponse.json({ error: adminData.error }, { status: adminData.status });
    }

    // Buscar os usuários vinculados à empresa do admin que tem role = 'equipe'
    const { data: vinculos, error: vinculosError } = await supabaseAdmin
      .from('st_usuarios_empresas')
      .select('user_id')
      .eq('empresa_id', adminData.empresaId)
      .eq('role', 'equipe');

    if (vinculosError) {
      return NextResponse.json({ error: vinculosError.message }, { status: 400 });
    }

    const equipeIds = vinculos.map(v => v.user_id);

    // Listar todos os usuários do auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Filtrar apenas os usuários que estão na equipe desta empresa
    const equipe = users
      .filter(u => equipeIds.includes(u.id))
      .map(u => ({
        id: u.id,
        email: u.email,
        nome: u.user_metadata?.nome || 'Usuário sem nome',
        ocultar_financeiro: u.user_metadata?.ocultar_financeiro || false,
        ocultar_relatorios: u.user_metadata?.ocultar_relatorios || false,
        ocultar_equipe: u.user_metadata?.ocultar_equipe || false,
        ocultar_motoristas: u.user_metadata?.ocultar_motoristas || false,
        ativo: !u.user_metadata?.inativo,
        created_at: u.created_at,
      }));

    return NextResponse.json({ equipe });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminData = await getAdminEmpresa(req);
    if (adminData.error) {
      return NextResponse.json({ error: adminData.error }, { status: adminData.status });
    }

    const { nome, email, password, ocultar_financeiro, ocultar_relatorios, ocultar_equipe, ocultar_motoristas } = await req.json();

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Cria o usuário na Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'equipe',
        nome,
        ocultar_financeiro,
        ocultar_relatorios,
        ocultar_equipe,
        ocultar_motoristas,
        inativo: false
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // CRÍTICO: Vincular o novo funcionário à empresa do administrador
    const { error: insertError } = await supabaseAdmin
      .from('st_usuarios_empresas')
      .insert({
        user_id: data.user.id,
        empresa_id: adminData.empresaId,
        role: 'equipe'
      });

    if (insertError) {
      // Tentar reverter a criação se der erro de vínculo?
      // await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: 'Usuário criado, mas erro ao vincular empresa: ' + insertError.message }, { status: 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const adminData = await getAdminEmpresa(req);
    if (adminData.error) {
      return NextResponse.json({ error: adminData.error }, { status: adminData.status });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
    }

    // Apenas marca como inativo em vez de deletar da auth.users, 
    // assim não perdemos os rastros e logs.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { inativo: true }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

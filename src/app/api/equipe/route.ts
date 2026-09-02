import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET() {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Filtra apenas os usuarios da equipe (ignorando motoristas e o admin principal que pode não ter role especifica)
    const equipe = users
      .filter(u => u.user_metadata?.role === 'equipe')
      .map(u => ({
        id: u.id,
        email: u.email,
        nome: u.user_metadata?.nome || 'Usuário sem nome',
        ocultar_financeiro: u.user_metadata?.ocultar_financeiro || false,
        ocultar_relatorios: u.user_metadata?.ocultar_relatorios || false,
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
    const { nome, email, password, ocultar_financeiro, ocultar_relatorios } = await req.json();

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'equipe',
        nome,
        ocultar_financeiro,
        ocultar_relatorios,
        inativo: false
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
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

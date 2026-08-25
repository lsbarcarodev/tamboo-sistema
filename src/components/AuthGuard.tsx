"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // /login e /sair são sempre acessíveis — não redirecionar
    if (pathname.startsWith('/login') || pathname.startsWith('/sair')) {
      setLoading(false);
      return;
    }

    // Rotas exclusivas do admin (motoristas não podem entrar)
    const adminRoutes = ['/', '/clientes', '/equipamentos', '/motoristas', '/financeiro', '/relatorios', '/configuracoes'];
    const isAdminRoute = adminRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
    // isMotoristaRoute: APENAS /motorista exato ou /motorista/* — NÃO /motoristas (que é rota do admin)
    const isMotoristaRoute = pathname === '/motorista' || pathname.startsWith('/motorista/');

    const checkUser = async () => {
      if (localStorage.getItem('tamboo_dont_remember') === 'true' && !sessionStorage.getItem('tamboo_active_session')) {
        await supabase.auth.signOut();
        localStorage.removeItem('tamboo_dont_remember');
      } else {
        sessionStorage.setItem('tamboo_active_session', 'true');
      }

      // 1. Tentar login mágico globalmente se a URL tiver ?auth=
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get('auth');
      
      if (authParam && !pathname.startsWith('/login')) {
        try {
          const decoded = JSON.parse(atob(authParam));
          if (decoded.e && decoded.p) {
            await supabase.auth.signInWithPassword({ email: decoded.e, password: decoded.p });
            window.history.replaceState({}, document.title, pathname);
            return;
          }
        } catch (e) {
          // falhou silenciosamente
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Sem sessão → login
        if (!pathname.startsWith('/login')) {
          if (pathname.startsWith('/motorista')) {
            router.push('/login/motorista');
          } else {
            router.push('/login');
          }
        } else {
          setLoading(false);
        }
        return;
      }

      // Tem sessão → verifica a role
      const { data: userRole } = await supabase
        .from('st_usuarios_empresas')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      const isDriver = userRole?.role === 'motorista';

      if (pathname.startsWith('/login')) {
        // Redireciona para a área certa após login
        router.push(isDriver ? '/motorista' : '/');
        return;
      }

      if (isDriver && isAdminRoute) {
        // Motorista tentando acessar área de admin → vai para o app dele
        router.push('/motorista');
        return;
      }

      if (!isDriver && isMotoristaRoute) {
        // Admin tentando acessar área de motorista → vai para o painel
        router.push('/');
        return;
      }

      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        if (!pathname.startsWith('/login')) {
          if (pathname.startsWith('/motorista')) {
            router.push('/login/motorista');
          } else {
            router.push('/login');
          }
        }
        return;
      }

      const { data: userRole } = await supabase
        .from('st_usuarios_empresas')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      const isDriver = userRole?.role === 'motorista';

      if (pathname.startsWith('/login')) {
        router.push(isDriver ? '/motorista' : '/');
        return;
      }

      if (isDriver && isAdminRoute) {
        router.push('/motorista');
        return;
      }

      if (!isDriver && isMotoristaRoute) {
        router.push('/');
        return;
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#EE4D2D] mb-4" />
        <p className="text-slate-500 font-medium">Carregando sistema...</p>
      </div>
    );
  }

  // Se estiver na tela de login, renderiza direto (não precisa de proteção de login)
  if (pathname.startsWith('/login')) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserData = {
  id: string;
  nome: string;
  role: string; // 'admin', 'motorista', 'equipe'
  ocultar_financeiro: boolean;
  ocultar_relatorios: boolean;
  ocultar_clientes: boolean;
  ocultar_equipamentos: boolean;
  ocultar_mapa: boolean;
};

type UserContextType = {
  user: UserData | null;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({ user: null, loading: true });

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Obter nome (pode vir de meta_data)
        let role = session.user.user_metadata?.role || 'admin';
        let nome = session.user.user_metadata?.nome || 'Administrador';
        
        // Verifica st_usuarios_empresas para ver se é admin ou motorista
        const { data: userRole } = await supabase
          .from('st_usuarios_empresas')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
          
        if (userRole?.role) {
          role = userRole.role; // sobrescreve caso seja motorista
        }

        setUser({
          id: session.user.id,
          nome,
          role,
          ocultar_financeiro: !!session.user.user_metadata?.ocultar_financeiro,
          ocultar_relatorios: !!session.user.user_metadata?.ocultar_relatorios,
          ocultar_clientes: !!session.user.user_metadata?.ocultar_clientes,
          ocultar_equipamentos: !!session.user.user_metadata?.ocultar_equipamentos,
          ocultar_mapa: !!session.user.user_metadata?.ocultar_mapa,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setUser(null);
        } else {
          fetchUser();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

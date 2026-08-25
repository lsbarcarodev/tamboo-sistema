"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  ClipboardList, 
  Truck, 
  Users,
  Settings,
  Package,
  Map,
  LogOut,
  DollarSign
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-[#11211c] bg-[#19302a] text-white sticky top-0">
      <div className="flex h-16 items-center border-b border-[#11211c] px-6 mt-4 mb-2">
        <img src="/logo.png" alt="Tamboo" className="h-8 object-contain" />
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium gap-2">
          <div className="px-3 mb-2 text-xs font-semibold text-white/50 tracking-wider uppercase">
            Operação
          </div>
          
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              pathname === "/" ? "bg-[#11211c] text-white" : "text-white/70 hover:bg-[#11211c] hover:text-white"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Central de Operação
          </Link>
          <Link
            href="/mapa"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              pathname.startsWith("/mapa") ? "bg-[#11211c] text-white" : "text-white/70 hover:bg-[#11211c] hover:text-white"
            }`}
          >
            <Map className="h-4 w-4" />
            Mapa de Caçambas
          </Link>

          <div className="px-3 mt-6 mb-2 text-xs font-semibold text-white/50 tracking-wider uppercase">
            Cadastros
          </div>

          <Link
            href="/clientes"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              pathname.startsWith("/clientes") ? "bg-[#11211c] text-white" : "text-white/70 hover:bg-[#11211c] hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            Clientes
          </Link>
          <Link
            href="/equipamentos"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              pathname.startsWith("/equipamentos") ? "bg-[#11211c] text-white" : "text-white/70 hover:bg-[#11211c] hover:text-white"
            }`}
          >
            <Package className="h-4 w-4" />
            Equipamentos
          </Link>

          <div className="px-3 mt-6 mb-2 text-xs font-semibold text-white/50 tracking-wider uppercase">
            Utilidades
          </div>

          <Link
            href="/financeiro"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              pathname.startsWith("/financeiro") ? "bg-[#11211c] text-white" : "text-white/70 hover:bg-[#11211c] hover:text-white"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Financeiro
          </Link>

          <Link
            href="/relatorios"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              pathname.startsWith("/relatorios") ? "bg-[#11211c] text-white" : "text-white/70 hover:bg-[#11211c] hover:text-white"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </Link>


          <Link
            href="/motoristas"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              pathname.startsWith("/motoristas") ? "bg-[#11211c] text-white" : "text-white/70 hover:bg-[#11211c] hover:text-white"
            }`}
          >
            <Truck className="h-4 w-4" />
            App do Motorista
          </Link>
        </nav>
      </div>

      <div className="border-t border-[#11211c] p-4 flex flex-col gap-2">
        <Link
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-white/70 hover:bg-[#11211c] hover:text-white transition-all text-sm font-medium"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-rose-400 hover:bg-[#11211c] hover:text-rose-300 transition-all text-sm font-medium w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}

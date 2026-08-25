"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SairPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      // Limpa qualquer coisa salva no localStorage
      localStorage.removeItem("tamboo_saved_admin_email");
      localStorage.removeItem("tamboo_saved_admin_password");
      router.push("/login");
    };
    logout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="font-medium">Saindo...</p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, Mail, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRememberMe, setAdminRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Optional: Prefill email if you want, but the main session persistence is handled by Supabase.
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (error) {
        throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
      }

      if (data.session) {
        if (!adminRememberMe) {
          localStorage.setItem("tamboo_dont_remember", "true");
        } else {
          localStorage.removeItem("tamboo_dont_remember");
        }

        const { data: userRole } = await supabase
          .from('st_usuarios_empresas')
          .select('role')
          .eq('user_id', data.session.user.id)
          .single();

        if (userRole?.role === 'motorista') {
          router.push("/motorista");
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#19302a] p-8 text-center text-white flex flex-col items-center justify-center">
          <img src="/logo.png" alt="Tamboo Logo" className="h-14 object-contain drop-shadow-md" />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="p-6 flex flex-col gap-4">
          <div className="text-center mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acesso Administrativo</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="email"
                placeholder="seu@email.com"
                className="pl-10 h-12 bg-slate-50"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="password"
                placeholder="••••••••"
                className="pl-10 h-12 bg-slate-50"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox" 
              id="adminRemember" 
              checked={adminRememberMe}
              onChange={(e) => setAdminRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-800"
            />
            <label htmlFor="adminRemember" className="text-sm text-slate-600 font-medium cursor-pointer">
              Lembrar de mim
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-base rounded-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

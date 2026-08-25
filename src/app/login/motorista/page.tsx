"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, AlertCircle, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MotoristaLoginPage() {
  const [motoristaEmail, setMotoristaEmail] = useState("");
  const [motoristaRememberMe, setMotoristaRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Optional: Prefill email if you want, but the main session persistence is handled by Supabase.
  }, []);

  const handleMotoristaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const emailNormalized = motoristaEmail.toLowerCase().trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNormalized,
        password: `Tamboo@${emailNormalized}`,
      });

      if (error) {
        throw new Error("E-mail não encontrado. Confirme com o administrador o e-mail cadastrado.");
      }

      if (data.session) {
        if (!motoristaRememberMe) {
          localStorage.setItem("tamboo_dont_remember", "true");
        } else {
          localStorage.removeItem("tamboo_dont_remember");
        }
        router.push("/motorista");
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
          <img src="/logo.png" alt="Tamboo Logo" className="h-14 mb-4 object-contain drop-shadow-md" />
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mt-1">
            <Truck className="w-4 h-4 text-white/80" />
            <p className="text-sm font-semibold text-white/90">App do Motorista</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleMotoristaLogin} className="p-6 flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Seu E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="email"
                placeholder="motorista@email.com"
                className="pl-10 h-12 bg-slate-50 text-base"
                value={motoristaEmail}
                onChange={(e) => setMotoristaEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <p className="text-center text-[11px] text-slate-400 pt-1 font-medium px-2">
              Digite o e-mail que o administrador cadastrou para você.
            </p>
          </div>

          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox" 
              id="motoristaRemember" 
              checked={motoristaRememberMe}
              onChange={(e) => setMotoristaRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#EE4D2D] focus:ring-[#EE4D2D]"
            />
            <label htmlFor="motoristaRemember" className="text-sm text-slate-600 font-medium cursor-pointer">
              Lembrar de mim
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 bg-[#EE4D2D] hover:bg-[#D74022] text-white font-bold text-base rounded-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Acessar Minhas Tarefas'}
          </Button>
        </form>
      </div>
    </div>
  );
}

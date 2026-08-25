'use client';

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Phone, 
  Mail, 
  MessageSquare, 
  Loader2, 
  Trash2,
  Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function MotoristasPage() {
  const [loading, setLoading] = useState(true);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  
  // Form fields
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMotoristas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('st_motoristas')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setMotoristas(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar motoristas:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMotoristas();
  }, []);

  const handleVincular = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Pega a sessão atual do administrador para passar o token na API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch('/api/motoristas/vincular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ nome, telefone, email })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data.error || `Erro no servidor (Código: ${res.status})`);
      }

      // Sucesso!
      setOpenModal(false);
      
      // Envia a mensagem padrão do WhatsApp com o auto-login (usando os dados retornados)
      if (data.motorista) {
        enviarInstrucoesWhatsApp(nome, telefone, email);
      }

      // Limpar campos
      setNome("");
      setTelefone("");
      setEmail("");

      fetchMotoristas();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const limparTelefone = (tel: string) => {
    const numeros = tel.replace(/\D/g, "");
    if (numeros.length === 10 || numeros.length === 11) {
      return `55${numeros}`;
    }
    return numeros;
  };

  const enviarInstrucoesWhatsApp = (mNome: string, mTelefone: string, mEmail: string) => {
    const telFormatado = limparTelefone(mTelefone);
    
    let msg = `Olá, *${mNome}*! Você foi cadastrado como motorista no nosso sistema de gestão.\n\n`;
    msg += `Acesse o App do Motorista pelo link:\n`;
    msg += `${window.location.origin}/login/motorista\n\n`;
    if (mEmail) {
      msg += `Seu E-mail: ${mEmail}\n`;
      msg += `Sua Senha: Tamboo@${mEmail}\n\n`;
    }
    msg += `(Guarde esta mensagem para acessar suas tarefas!)`;

    window.open(`https://wa.me/${telFormatado}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const deletarMotorista = async (id: string, userId: string) => {
    if (!confirm("Tem certeza que deseja desvincular este motorista? O acesso dele ao aplicativo será removido.")) return;

    try {
      // Como o motorista está no auth.users, precisamos deletá-lo.
      // Porém, no front-end não temos acesso de deleção do auth de outros users (segurança).
      // Mas o banco de dados tem CASCADE delete para st_motoristas.
      // Vamos deletar da tabela pública st_motoristas, o que o RLS do adm permite.
      // E no backend, para limpar o auth.users, podemos chamar uma função ou apenas deletar da tabela pública 
      // (a tabela auth do Supabase manterá o usuário mas sem nenhuma empresa/perfil, ou seja, inutilizado).
      // Para fazer a exclusão limpa do auth, a melhor prática é apenas deletar na st_motoristas, RLS cuidará.
      const { error } = await supabase
        .from('st_motoristas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMotoristas(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      console.error("Erro ao deletar:", err.message);
      alert("Erro ao excluir motorista: " + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#19302a] tracking-tight">Motoristas</h1>
          <p className="text-slate-500 mt-1">Cadastre e vincule motoristas para enviar despachos no aplicativo.</p>
        </div>

        <Button 
          onClick={() => setOpenModal(true)}
          className="bg-[#19302a] hover:bg-[#12231e] text-white gap-2 rounded-xl h-11 px-5 font-semibold"
        >
          <UserPlus className="h-5 w-5" />
          Vincular Motorista
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#19302a] mb-2" />
          <p className="text-slate-500">Buscando motoristas...</p>
        </div>
      ) : motoristas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border shadow-sm flex flex-col items-center justify-center">
          <Users className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Nenhum motorista vinculado</h3>
          <p className="text-slate-400 mt-1 max-w-sm">Cadastre o seu primeiro motorista acima para habilitar o despacho inteligente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {motoristas.map((m) => (
            <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-sm transition-shadow gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-2xl uppercase shrink-0">
                  {m.nome.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xl">{m.nome}</h3>
                  <div className="flex items-center gap-4 text-base text-slate-600 mt-1">
                    <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {m.telefone}</span>
                    <span className="hidden sm:flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> Acesso Mágico Habilitado</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:ml-auto">
                <Button 
                  onClick={() => enviarInstrucoesWhatsApp(m.nome, m.telefone, m.email)}
                  className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold h-11 gap-2 rounded-xl text-sm px-5 shadow-sm"
                  variant="outline"
                >
                  <MessageSquare className="h-4 w-4" />
                  Enviar App
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => deletarMotorista(m.id, m.user_id)}
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-11 w-11 rounded-xl shrink-0"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Dialog de Cadastro */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Novo Motorista</DialogTitle>
            <DialogDescription>
              Crie o acesso de login do motorista. Ao finalizar, as credenciais serão enviadas a ele por WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleVincular} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                value={nome} 
                onChange={e => setNome(e.target.value)} 
                placeholder="Ex: João da Silva"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>E-mail do Motorista</Label>
              <Input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="motorista@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Celular / WhatsApp</Label>
              <Input 
                value={telefone} 
                onChange={e => setTelefone(e.target.value)} 
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpenModal(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#19302a] hover:bg-[#12231e] text-white rounded-xl">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  "Cadastrar e Enviar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

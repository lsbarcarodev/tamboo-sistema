"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Loader2, Trash2, UserPlus, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

  type MembroEquipe = {
    id: string;
    nome: string;
    email: string;
    ocultar_financeiro: boolean;
    ocultar_relatorios: boolean;
    ocultar_clientes: boolean;
    ocultar_equipamentos: boolean;
    ocultar_mapa: boolean;
    ativo: boolean;
    created_at: string;
  };

export default function EquipePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ocultarFinanceiro, setOcultarFinanceiro] = useState(false);
  const [ocultarRelatorios, setOcultarRelatorios] = useState(false);
  const [ocultarClientes, setOcultarClientes] = useState(false);
  const [ocultarEquipamentos, setOcultarEquipamentos] = useState(false);
  const [ocultarMapa, setOcultarMapa] = useState(false);

  useEffect(() => {
    if (!userLoading && user?.role === 'equipe') {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  const fetchEquipe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/equipe');
      if (res.ok) {
        const data = await res.json();
        setEquipe(data.equipe || []);
      }
    } catch (e) {
      console.error("Erro ao buscar equipe:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'equipe') {
      fetchEquipe();
    }
  }, [user]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email,
          password,
          ocultar_financeiro: ocultarFinanceiro,
          ocultar_relatorios: ocultarRelatorios,
          ocultar_clientes: ocultarClientes,
          ocultar_equipamentos: ocultarEquipamentos,
          ocultar_mapa: ocultarMapa
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      setModalOpen(false);
      setNome('');
      setEmail('');
      setPassword('');
      setOcultarFinanceiro(false);
      setOcultarRelatorios(false);
      setOcultarClientes(false);
      setOcultarEquipamentos(false);
      setOcultarMapa(false);
      fetchEquipe();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateUser = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja inativar o acesso de ${nome}? Ele não poderá mais fazer login, mas o histórico será mantido.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/equipe?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Erro ao inativar usuário');
      
      fetchEquipe();
    } catch (e) {
      alert('Erro ao inativar usuário.');
    }
  };

  if (userLoading || user?.role === 'equipe') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border shadow-sm h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#19302a] mb-2" />
        <p className="text-slate-500">Verificando permissões...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Equipe / Usuários</h1>
          <p className="text-slate-500 mt-1">Gerencie os acessos do seu time ao sistema.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-[#19302a] hover:bg-[#11211c] text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Restrições</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando equipe...
                  </TableCell>
                </TableRow>
              ) : equipe.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    Nenhum membro da equipe cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                equipe.map((membro) => (
                  <TableRow key={membro.id} className={!membro.ativo ? 'opacity-60 bg-slate-50' : ''}>
                    <TableCell className="font-medium">{membro.nome}</TableCell>
                    <TableCell className="text-slate-500">{membro.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {membro.ocultar_financeiro && (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full inline-flex items-center w-fit">
                            <EyeOff className="h-3 w-3 mr-1" /> Financeiro
                          </span>
                        )}
                        {membro.ocultar_relatorios && (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full inline-flex items-center w-fit">
                            <EyeOff className="h-3 w-3 mr-1" /> Relatórios
                          </span>
                        )}
                        {membro.ocultar_clientes && (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full inline-flex items-center w-fit">
                            <EyeOff className="h-3 w-3 mr-1" /> Clientes
                          </span>
                        )}
                        {membro.ocultar_equipamentos && (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full inline-flex items-center w-fit">
                            <EyeOff className="h-3 w-3 mr-1" /> Equipamentos
                          </span>
                        )}
                        {membro.ocultar_mapa && (
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full inline-flex items-center w-fit">
                            <EyeOff className="h-3 w-3 mr-1" /> Mapa
                          </span>
                        )}
                        {!membro.ocultar_financeiro && !membro.ocultar_relatorios && !membro.ocultar_clientes && !membro.ocultar_equipamentos && !membro.ocultar_mapa && (
                          <span className="text-xs text-slate-400">Acesso total</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {membro.ativo ? (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500 flex items-center">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" /> Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {membro.ativo && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                          onClick={() => handleDeactivateUser(membro.id, membro.nome)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover Acesso
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle>Novo Usuário da Equipe</DialogTitle>
              <DialogDescription>
                Crie um novo acesso para um orçamentista ou operador.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input 
                  id="nome" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  required 
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email de Login</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="joao@empresa.com.br"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha Temporária</Label>
                <Input 
                  id="password" 
                  type="text" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Defina uma senha de 6 dígitos"
                  minLength={6}
                />
              </div>

              <div className="mt-4 space-y-3 p-3 bg-slate-50 border rounded-lg">
                <Label className="text-sm font-semibold text-slate-700">Restrições de Acesso</Label>
                
                <Label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-[#19302a] focus:ring-[#19302a]"
                    checked={ocultarFinanceiro}
                    onChange={(e) => setOcultarFinanceiro(e.target.checked)}
                  />
                  Ocultar Financeiro
                </Label>
                
                <Label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-[#19302a] focus:ring-[#19302a]"
                    checked={ocultarRelatorios}
                    onChange={(e) => setOcultarRelatorios(e.target.checked)}
                  />
                  Ocultar Relatórios
                </Label>
                
                <Label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-[#19302a] focus:ring-[#19302a]"
                    checked={ocultarClientes}
                    onChange={(e) => setOcultarClientes(e.target.checked)}
                  />
                  Ocultar Clientes
                </Label>

                <Label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-[#19302a] focus:ring-[#19302a]"
                    checked={ocultarEquipamentos}
                    onChange={(e) => setOcultarEquipamentos(e.target.checked)}
                  />
                  Ocultar Equipamentos
                </Label>

                <Label className="flex items-center gap-2 font-normal cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-[#19302a] focus:ring-[#19302a]"
                    checked={ocultarMapa}
                    onChange={(e) => setOcultarMapa(e.target.checked)}
                  />
                  Ocultar Mapa de Caçambas
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#19302a] hover:bg-[#11211c] text-white">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

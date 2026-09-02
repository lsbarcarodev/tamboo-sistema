"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientFormModal } from "@/components/ClientFormModal";
import { Users, Phone, MapPin, Trash2, Edit, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteExcluir, setClienteExcluir] = useState<{id: string, nome: string} | null>(null);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('st_clientes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirConfirmado = async () => {
    if (!clienteExcluir) return;
    try {
      const { error } = await supabase.from('st_clientes').delete().eq('id', clienteExcluir.id);
      if (error) throw error;
      fetchClientes();
      setClienteExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir cliente.");
    }
  };

  const formatarWhatsappLink = (tel: string) => {
    if (!tel) return "#";
    const apenasNumeros = tel.replace(/\D/g, "");
    return `https://wa.me/55${apenasNumeros}`;
  };

  const extrairEnderecoResumido = (endCompleto: string) => {
    if (!endCompleto) return "Não informado";
    // Ex: Rua das Flores, 123 - Centro - Cidade/UF - CEP: 00000-000
    // Vamos tentar pegar só até o bairro ou número
    const partes = endCompleto.split(" - ");
    if (partes.length > 0) {
      // Retorna Rua, Número e o CEP que geralmente está no final
      const ruaNum = partes[0];
      const cepStr = endCompleto.match(/CEP: \d{5}-\d{3}/)?.[0] || "";
      return `${ruaNum} ${cepStr ? `(${cepStr})` : ""}`;
    }
    return endCompleto.substring(0, 40) + "...";
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie a sua base de clientes e obras.</p>
        </div>
        <ClientFormModal onSuccess={fetchClientes} />
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhum cliente cadastrado</h3>
            <p className="text-slate-500 max-w-sm mt-1">
              Adicione seu primeiro cliente para começar a gerar pedidos de locação.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">NOME / RAZÃO SOCIAL</th>
                  <th className="px-6 py-4 font-medium">RESPONSÁVEL / WHATSAPP</th>
                  <th className="px-6 py-4 font-medium">ENDEREÇO PRINCIPAL</th>
                  <th className="px-6 py-4 font-medium text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientes.map((cliente) => (
                  <tr 
                    key={cliente.id} 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      // Ignora cliques que vieram do Modal (Portal renderizado no body)
                      if (!(e.currentTarget as HTMLElement).contains(e.target as Node)) return;
                      // Ignora cliques em botões ou links da própria tabela
                      if ((e.target as HTMLElement).closest('a, button')) return;
                      
                      document.getElementById(`btn-edit-${cliente.id}`)?.click();
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{cliente.nome}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{cliente.documento || "Sem documento"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <UserIcon className="h-3 w-3 text-slate-400" />
                          {cliente.nome_responsavel || "Não informado"}
                        </div>
                        {cliente.telefone && (
                          <a 
                            href={formatarWhatsappLink(cliente.telefone)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-green-600 hover:text-green-700 font-medium"
                          >
                            <Phone className="h-3 w-3" />
                            {cliente.telefone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[250px] truncate">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={cliente.endereco_padrao}>
                          {extrairEnderecoResumido(cliente.endereco_padrao)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ClientFormModal 
                          editId={cliente.id} 
                          onSuccess={fetchClientes} 
                          openButton={
                            <Button id={`btn-edit-${cliente.id}`} variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                          }
                        />

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" 
                          title="Excluir"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClienteExcluir({id: cliente.id, nome: cliente.nome});
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!clienteExcluir} onOpenChange={(open) => !open && setClienteExcluir(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente <strong>"{clienteExcluir?.nome}"</strong>?<br/>
              Esta ação apagará também todos os endereços e pedidos atrelados a ele.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setClienteExcluir(null)}>
              Não, cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirConfirmado}>
              Sim, excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

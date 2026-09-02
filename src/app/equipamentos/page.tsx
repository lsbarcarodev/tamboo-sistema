"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { EquipamentoFormModal } from "@/components/EquipamentoFormModal";

export default function EquipamentosPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Edit state
  const [equipToEdit, setEquipToEdit] = useState<any | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Delete state
  const [equipToDelete, setEquipToDelete] = useState<any | null>(null);

  useEffect(() => {
    if (!userLoading && user?.ocultar_equipamentos) {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  const carregarEquipamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('st_equipamentos')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setEquipamentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEquipamentos();
  }, []);

  const handleEditClick = (eq: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEquipToEdit(eq);
    setEditOpen(true);
  };

  const handleDeleteClick = (eq: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEquipToDelete(eq);
  };

  const confirmarExclusao = async () => {
    if (!equipToDelete) return;
    try {
      const { error } = await supabase
        .from('st_equipamentos')
        .delete()
        .eq('id', equipToDelete.id);
      if (error) throw error;
      setEquipamentos(equipamentos.filter(e => e.id !== equipToDelete.id));
      setEquipToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir equipamento:", error);
      alert("Erro ao excluir equipamento.");
    }
  };

  const equipamentosFiltrados = equipamentos.filter(eq => 
    eq.codigo_interno?.toLowerCase().includes(busca.toLowerCase()) || 
    eq.tipo?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Estoque de Equipamentos</h1>
          <p className="text-slate-500 mt-1">Gerencie o cadastro de caçambas e tambores da empresa.</p>
        </div>
        <EquipamentoFormModal onSuccess={carregarEquipamentos} />
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  Equipamentos Cadastrados
                </CardTitle>
                <CardDescription>
                  {equipamentos.length} {equipamentos.length === 1 ? 'equipamento cadastrado' : 'equipamentos cadastrados'} no total.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Buscar equipamento..."
                    className="w-64 pl-9 bg-white"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Código Interno</TableHead>
                  <TableHead className="font-semibold text-slate-700">Tipo</TableHead>
                  <TableHead className="font-semibold text-slate-700">Capacidade</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Observações</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      Carregando equipamentos...
                    </TableCell>
                  </TableRow>
                ) : equipamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      Nenhum equipamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipamentosFiltrados.map((eq) => (
                    <TableRow
                      key={eq.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => handleEditClick(eq)}
                    >
                      <TableCell className="font-medium text-slate-900">{eq.codigo_interno}</TableCell>
                      <TableCell>{eq.tipo}</TableCell>
                      <TableCell className="text-slate-600">{eq.capacidade || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          eq.status === 'Disponível' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                          eq.status === 'Alocado' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                          eq.status === 'Manutenção' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                          'bg-slate-50 text-slate-700 ring-slate-600/20'
                        }`}>
                          {eq.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 truncate max-w-[200px]" title={eq.observacoes}>
                        {eq.observacoes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            onClick={(e) => handleEditClick(eq, e)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => handleDeleteClick(eq, e)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal (controlled) */}
      <EquipamentoFormModal
        equipamento={equipToEdit}
        open={editOpen}
        onOpenChange={(val) => {
          setEditOpen(val);
          if (!val) setEquipToEdit(null);
        }}
        onSuccess={() => {
          carregarEquipamentos();
          setEditOpen(false);
          setEquipToEdit(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!equipToDelete} onOpenChange={(open) => !open && setEquipToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Excluir Equipamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o equipamento <strong className="text-slate-900">{equipToDelete?.codigo_interno}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setEquipToDelete(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmarExclusao}
            >
              Sim, Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

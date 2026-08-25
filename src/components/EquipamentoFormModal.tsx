"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Equipamento {
  id: string;
  codigo_interno: string;
  tipo: string;
  status: string;
  capacidade: string;
  observacoes: string;
}

interface EquipamentoFormModalProps {
  onSuccess?: () => void;
  // When provided, the modal opens in edit mode (no trigger button rendered)
  equipamento?: Equipamento | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EquipamentoFormModal({ onSuccess, equipamento, open: controlledOpen, onOpenChange }: EquipamentoFormModalProps) {
  const isEditMode = !!equipamento;
  const isControlled = controlledOpen !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [loading, setLoading] = useState(false);
  
  const [codigoInterno, setCodigoInterno] = useState("");
  const [tipo, setTipo] = useState("Caçamba");
  const [capacidade, setCapacidade] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (open && equipamento) {
      setCodigoInterno(equipamento.codigo_interno || "");
      setTipo(equipamento.tipo || "Caçamba");
      setCapacidade(equipamento.capacidade || "");
      setObservacoes(equipamento.observacoes || "");
    } else if (open && !equipamento) {
      resetForm();
    }
  }, [open, equipamento]);

  const resetForm = () => {
    setCodigoInterno("");
    setTipo("Caçamba");
    setCapacidade("");
    setObservacoes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isEditMode && equipamento) {
        // Never touch status on edit - it's managed by the orders system
        const { error } = await supabase
          .from('st_equipamentos')
          .update({ codigo_interno: codigoInterno, tipo, capacidade, observacoes })
          .eq('id', equipamento.id);
        if (error) throw error;
      } else {
        // New equipment always starts as Disponível
        const { error } = await supabase
          .from('st_equipamentos')
          .insert([{ codigo_interno: codigoInterno, tipo, status: 'Disponível', capacidade, observacoes }]);
        if (error) throw error;
      }
      
      setOpen(false);
      resetForm();
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error("Erro ao salvar equipamento:", error);
      alert("Erro ao salvar equipamento. Verifique se o código interno já não existe.");
    } finally {
      setLoading(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{isEditMode ? "Editar Equipamento" : "Cadastrar Novo Equipamento"}</DialogTitle>
        <DialogDescription>
          {isEditMode ? "Atualize os dados do equipamento." : "Insira os dados do tambor ou caçamba para controle de estoque."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="codigo">Código Interno / Identificação</Label>
            <Input 
              id="codigo" 
              placeholder="Ex: T-001, CAC-05" 
              required
              value={codigoInterno}
              onChange={(e) => setCodigoInterno(e.target.value)}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="tipo">Tipo de Equipamento</Label>
            <Select value={tipo} onValueChange={(val) => {
              if (val) {
                setTipo(val);
                setCapacidade("");
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Caçamba">Caçamba</SelectItem>
                <SelectItem value="Tambor">Tambor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="capacidade">Capacidade / Tamanho</Label>
            <Select value={capacidade} onValueChange={(v) => { if (v) setCapacidade(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tamanho" />
              </SelectTrigger>
              <SelectContent>
                {tipo === 'Tambor' ? (
                  <>
                    <SelectItem value="200L">200 Litros</SelectItem>
                    <SelectItem value="100L">100 Litros</SelectItem>
                    <SelectItem value="50L">50 Litros</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="3m³">3 m³</SelectItem>
                    <SelectItem value="4m³">4 m³</SelectItem>
                    <SelectItem value="5m³">5 m³</SelectItem>
                    <SelectItem value="7m³">7 m³</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="obs">Observações</Label>
          <Input 
            id="obs" 
            placeholder="Alguma avaria ou detalhe importante?" 
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
            {loading ? "Salvando..." : isEditMode ? "Salvar Alterações" : "Salvar Equipamento"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  // Controlled mode (edit) — no trigger rendered
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode (create) — with trigger button
  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" />}>
        <Plus className="h-4 w-4" />
        Novo Equipamento
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

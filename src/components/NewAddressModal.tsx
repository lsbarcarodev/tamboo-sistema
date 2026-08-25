"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

interface NewAddressModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  clienteId: string;
  onSuccess: (newAddressId: string) => void;
}

export function NewAddressModal({ open, setOpen, clienteId, onSuccess }: NewAddressModalProps) {
  const [loading, setLoading] = useState(false);
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").substr(0, 9);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatCEP(e.target.value);
    setCep(val);
    
    const justNumbers = val.replace(/\D/g, "");
    if (justNumbers.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${justNumbers}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
          document.getElementById("novo_numero")?.focus();
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) return;

    setLoading(true);
    try {
      // Verifica se já existem endereços para definir como padrão
      const { count } = await supabase
        .from("st_enderecos")
        .select("*", { count: "exact", head: true })
        .eq("cliente_id", clienteId);

      const isPadrao = count === 0;

      const { data, error } = await supabase
        .from("st_enderecos")
        .insert([{
          cliente_id: clienteId,
          cep: cep.replace(/\D/g, ""),
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          is_padrao: isPadrao
        }])
        .select()
        .single();

      if (error) throw error;

      setOpen(false);
      
      // Limpa o form
      setCep("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setUf("");

      if (data) {
        onSuccess(data.id);
      }
    } catch (error: any) {
      console.error("Erro ao salvar endereço:", error);
      alert("Erro ao salvar endereço: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Endereço de Entrega</DialogTitle>
          <DialogDescription>
            Digite o CEP para buscar o endereço automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 sm:col-span-1 space-y-2">
              <Label htmlFor="novo_cep">CEP</Label>
              <Input id="novo_cep" value={cep} onChange={handleCepChange} required placeholder="00000-000" />
            </div>
            <div className="col-span-3 sm:col-span-2 space-y-2">
              <Label htmlFor="novo_logradouro">Logradouro</Label>
              <Input id="novo_logradouro" value={logradouro} onChange={e => setLogradouro(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 space-y-2">
              <Label htmlFor="novo_numero">Número</Label>
              <Input id="novo_numero" value={numero} onChange={e => setNumero(e.target.value)} required />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="novo_complemento">Complemento <span className="text-muted-foreground font-normal">(opc)</span></Label>
              <Input id="novo_complemento" value={complemento} onChange={e => setComplemento(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="novo_bairro">Bairro</Label>
              <Input id="novo_bairro" value={bairro} onChange={e => setBairro(e.target.value)} required />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="novo_cidade">Cidade</Label>
              <Input id="novo_cidade" value={cidade} onChange={e => setCidade(e.target.value)} required />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="novo_uf">UF</Label>
              <Input id="novo_uf" value={uf} onChange={e => setUf(e.target.value)} required maxLength={2} />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Endereço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

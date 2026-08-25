"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ClientFormModal } from "./ClientFormModal";
import { NewAddressModal } from "./NewAddressModal";

interface NewOrderModalProps {
  onSuccess?: () => void;
}

export function NewOrderModal({ onSuccess }: NewOrderModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [enderecosList, setEnderecosList] = useState<any[]>([]);
  const [equipamentosList, setEquipamentosList] = useState<any[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingEnderecos, setLoadingEnderecos] = useState(false);
  const [loadingEquips, setLoadingEquips] = useState(false);
  const [openNewAddressModal, setOpenNewAddressModal] = useState(false);
  
  const [clienteId, setClienteId] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openEquipCombobox, setOpenEquipCombobox] = useState(false);
  const [equipamentoId, setEquipamentoId] = useState("");
  const [enderecoId, setEnderecoId] = useState("manual");
  const [enderecoTexto, setEnderecoTexto] = useState("");
  const [tipo, setTipo] = useState("Colocação");
  const [equipamento, setEquipamento] = useState("Caçamba");
  const [valorLocacaoDisplay, setValorLocacaoDisplay] = useState("");
  const [valorLocacaoCents, setValorLocacaoCents] = useState(0);
  const [dataLocacao, setDataLocacao] = useState(new Date().toISOString().split('T')[0]);
  const [dataRetirada, setDataRetirada] = useState("");
  const [mtr, setMtr] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [pago, setPago] = useState(false);

  const resetForm = () => {
    setClienteId("");
    setEnderecoId("manual");
    setEnderecoTexto("");
    setTipo("Colocação");
    setEquipamento("Caçamba");
    setEquipamentoId("");
    setValorLocacaoDisplay("");
    setValorLocacaoCents(0);
    setEnderecosList([]);
    setEquipamentosList([]);
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    setDataLocacao(localISOTime);
    setDataRetirada("");
    setMtr("");
    setFormaPagamento("Pix");
    setPago(false);
  };

  useEffect(() => {
    if (open) {
      resetForm();
      buscarClientes();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      buscarEquipamentosDisponiveis();
    }
  }, [open, equipamento]);

  const buscarClientes = async () => {
    setLoadingClientes(true);
    try {
      const { data, error } = await supabase.from('st_clientes').select('*').order('nome');
      if (error) throw error;
      setClientesList(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const buscarEquipamentosDisponiveis = async () => {
    setLoadingEquips(true);
    try {
      const { data, error } = await supabase
        .from('st_equipamentos')
        .select('*')
        .eq('tipo', equipamento)
        .order('codigo_interno');
      
      if (error) throw error;
      setEquipamentosList(data || []);
      setEquipamentoId(""); // Reseta a seleção quando muda o tipo
    } catch (error) {
      console.error("Erro ao buscar equipamentos", error);
    } finally {
      setLoadingEquips(false);
    }
  };

  const handleClienteChange = async (id: string) => {
    setClienteId(id);
    setEnderecoId("");
    setEnderecoTexto("");
    setEnderecosList([]);
    setLoadingEnderecos(true);
    
    // Buscar endereços desse cliente
    try {
      const { data, error } = await supabase
        .from('st_enderecos')
        .select('*')
        .eq('cliente_id', id)
        .order('is_padrao', { ascending: false }); // Padrão primeiro
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setEnderecosList(data);
        setEnderecoId(data[0].id); // Auto-seleciona o primeiro (que será o padrão)
        
        // Formatar o texto do endereço selecionado para salvar no pedido (desnormalizado)
        const e = data[0];
        setEnderecoTexto(`${e.logradouro}, ${e.numero}${e.complemento ? ` - ${e.complemento}` : ''} - ${e.bairro} - ${e.cidade}/${e.uf}`);
      } else {
        // Fallback: se não achar endereço na tabela nova, tenta usar o endereco_padrao do cliente
        setEnderecoId("manual");
        const clienteSelecionado = clientesList.find(c => c.id === id);
        if (clienteSelecionado && clienteSelecionado.endereco_padrao) {
          setEnderecoTexto(clienteSelecionado.endereco_padrao);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar endereços:", error);
    } finally {
      setLoadingEnderecos(false);
    }
  };

  const handleEnderecoChange = (id: string | null) => {
    if (!id) return;
    if (id === "manual") {
      setOpenNewAddressModal(true);
      return;
    }
    setEnderecoId(id);
    const e = enderecosList.find(end => end.id === id);
    if (e) {
      setEnderecoTexto(`${e.logradouro}, ${e.numero}${e.complemento ? ` - ${e.complemento}` : ''} - ${e.bairro} - ${e.cidade}/${e.uf}`);
    }
  };

  const handleNewAddressSuccess = async (newId: string) => {
    if (clienteId) {
      setLoadingEnderecos(true);
      const { data } = await supabase.from('st_enderecos').select('*').eq('cliente_id', clienteId).order('is_padrao', { ascending: false });
      if (data) {
        setEnderecosList(data);
        const e = data.find(end => end.id === newId);
        if (e) {
          setEnderecoId(newId);
          setEnderecoTexto(`${e.logradouro}, ${e.numero}${e.complemento ? ` - ${e.complemento}` : ''} - ${e.bairro} - ${e.cidade}/${e.uf}`);
        }
      }
      setLoadingEnderecos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    
    setLoading(true);
    
    try {
      const clienteSelecionado = clientesList.find(c => c.id === clienteId);
      const equipSelecionado = equipamentosList.find(e => e.id === equipamentoId);

      let initialStatus = 'Pendente';
      if (tipo === 'Troca') initialStatus = 'Retirada';
      if (tipo === 'Retirada') initialStatus = 'Finalizado';

      // Payload base (colunas que sempre existem)
      const basePayload: any = {
        data_locacao: dataLocacao ? `${dataLocacao}T12:00:00Z` : null,
        cliente_id: clienteId,
        cliente_nome: clienteSelecionado?.nome || "Cliente Desconhecido",
        equipamento,
        tipo,
        status: initialStatus,
        endereco_entrega: enderecoTexto,
        updated_by: 'Administrador',
        mtr: mtr || null,
        forma_pagamento: formaPagamento,
        pago: pago,
      };

      // Adiciona data_retirada se foi preenchida
      if (dataRetirada) {
        basePayload.data_retirada = `${dataRetirada}T12:00:00Z`;
      } // Adiciona valor_locacao se foi preenchido
      if (valorLocacaoCents > 0) basePayload.valor_locacao = valorLocacaoCents / 100;

      // Adiciona colunas de equipamento individual se selecionado
      if (equipamentoId) {
        basePayload.equipamento_id = equipamentoId;
        basePayload.equipamento_codigo = equipSelecionado?.codigo_interno || null;
      }

      

      let orderError: any = null;
      let payload: any = { ...basePayload };

      // Tenta inserir. Se uma coluna não existe ainda (PGRST204), remove e tenta de novo
      while (true) {
        const { error: err } = await supabase.from('st_locacoes').insert([payload]);
        if (!err) { orderError = null; break; }
        if (err.code === 'PGRST204') {
          const match = err.message.match(/the '([^']+)' column/);
          const missingCol = match?.[1];
          if (missingCol && missingCol in payload) {
            console.warn(`Coluna '${missingCol}' não existe no banco ainda. Salvando sem ela.`);
            const updated: any = {};
            Object.keys(payload).forEach(k => { if (k !== missingCol) updated[k] = payload[k]; });
            payload = updated;
          } else {
            orderError = err; break;
          }
        } else {
          orderError = err; break;
        }
      }

      if (orderError) throw orderError;
      
      // Se selecionou um equipamento específico, atualiza o status dele para Alocado
      if (equipamentoId) {
        const { error: equipError } = await supabase
          .from('st_equipamentos')
          .update({ status: 'Alocado' })
          .eq('id', equipamentoId);
        if (equipError) console.error('Erro ao atualizar status do equipamento:', equipError);
      }
      
      setOpen(false);
      resetForm();
      
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error("Erro ao criar pedido:", error);
      alert(`Erro ao salvar o pedido: ${error?.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" />
        }
      >
        <Plus className="h-4 w-4" />
        Nova Locação
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500">
              <Plus className="h-3 w-3" />
            </div>
            Novo pedido
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para registrar uma nova locação ou movimentação de equipamento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid w-full items-center gap-1.5 flex flex-col">
            <Label htmlFor="cliente">Cliente</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={openCombobox}
                    disabled={loadingClientes}
                    className={`w-full flex items-center justify-between border border-input rounded-lg h-8 px-2.5 text-sm cursor-pointer bg-white hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none`}
                  />
                }
              >
                <span className={clienteId ? 'text-foreground' : 'text-muted-foreground'}>
                  {clienteId
                    ? clientesList.find((c) => c.id === clienteId)?.nome
                    : loadingClientes ? "Carregando clientes..." : "Buscar cliente por nome..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Digite para buscar..." />
                  <CommandList>
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                    <CommandGroup>
                      <ClientFormModal 
                        onSuccess={(novoClienteId) => {
                          buscarClientes().then(() => {
                            if (novoClienteId) {
                              handleClienteChange(novoClienteId);
                            }
                          });
                          setOpenCombobox(false);
                        }}
                        openButton={
                          <button type="button" className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-emerald-50 text-emerald-600 font-medium transition-colors">
                            <Plus className="mr-2 h-4 w-4" /> Cadastrar novo cliente
                          </button>
                        }
                      />
                      {clientesList.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.nome}
                          onSelect={() => {
                            handleClienteChange(c.id);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              clienteId === c.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="enderecoSelect">Obra / Endereço de Entrega</Label>
            <Select value={enderecoId} onValueChange={handleEnderecoChange} disabled={!clienteId || loadingEnderecos}>
              <SelectTrigger className="w-full h-auto whitespace-normal [&>span]:line-clamp-none text-left">
                <SelectValue placeholder={loadingEnderecos ? "Carregando endereços..." : "Selecione o endereço"}>
                  {enderecoId === "manual" 
                    ? "+ Cadastrar Novo Endereço" 
                    : (enderecosList.find(e => e.id === enderecoId) 
                        ? `${enderecosList.find(e => e.id === enderecoId)?.logradouro}, ${enderecosList.find(e => e.id === enderecoId)?.numero}` 
                        : undefined)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} side="bottom">
                {enderecosList.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="whitespace-normal break-words">
                      {e.logradouro}, {e.numero} {e.bairro ? `- ${e.bairro}` : ''} {e.is_padrao ? "(Padrão)" : ""}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="manual">+ Cadastrar Novo Endereço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <NewAddressModal 
            open={openNewAddressModal} 
            setOpen={setOpenNewAddressModal} 
            clienteId={clienteId} 
            onSuccess={handleNewAddressSuccess} 
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="dataLocacao">Data de Locação (Entrega)</Label>
              <Input 
                id="dataLocacao" 
                type="date"
                required
                value={dataLocacao}
                onChange={(e) => setDataLocacao(e.target.value)}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="dataRetirada">Data de Retirada <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <Input 
                id="dataRetirada" 
                type="date"
                value={dataRetirada}
                onChange={(e) => setDataRetirada(e.target.value)}
              />
            </div>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="equipamento">Tipo de Equipamento</Label>
              <Select value={equipamento} onValueChange={(v) => { if (v) setEquipamento(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Caçamba">Caçamba</SelectItem>
                  <SelectItem value="Tambor">Tambor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="equipamentoEspec">Equipamento</Label>
              <Popover open={openEquipCombobox} onOpenChange={setOpenEquipCombobox}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={openEquipCombobox}
                      disabled={loadingEquips}
                      className="w-full flex items-center justify-between border border-input rounded-lg h-8 px-2.5 text-sm cursor-pointer bg-white hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    />
                  }
                >
                  <span className={equipamentoId ? 'text-foreground' : 'text-muted-foreground'}>
                    {equipamentoId
                      ? equipamentosList.find((e) => e.id === equipamentoId)?.codigo_interno
                      : loadingEquips ? "Carregando..." : "Buscar por código..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite para buscar..." />
                    <CommandList>
                      <CommandEmpty>Nenhum equipamento encontrado.</CommandEmpty>
                      <CommandGroup>
                        {equipamentosList.map((e) => {
                          const isUnavailable = e.status !== 'Disponível';
                          return (
                            <CommandItem
                              key={e.id}
                              value={e.codigo_interno}
                              disabled={isUnavailable}
                              onSelect={() => {
                                if (isUnavailable) return;
                                setEquipamentoId(e.id);
                                setOpenEquipCombobox(false);
                              }}
                              className={isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  equipamentoId === e.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1">{e.codigo_interno} {e.capacidade ? `(${e.capacidade})` : ''}</span>
                              {isUnavailable && (
                                <span className="ml-2 text-xs font-medium text-red-500 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                  Indisponível
                                </span>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Valor de Locação */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="valorLocacao">Valor de Locação</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 pointer-events-none select-none">
                R$
              </span>
              <Input
                id="valorLocacao"
                inputMode="numeric"
                placeholder="0,00"
                className="pl-9"
                value={valorLocacaoDisplay}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const cents = parseInt(digits || '0', 10);
                  setValorLocacaoCents(cents);
                  if (!digits) {
                    setValorLocacaoDisplay('');
                  } else {
                    setValorLocacaoDisplay(
                      (cents / 100).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    );
                  }
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mtr">MTR da Caçamba</Label>
            <Input
              id="mtr"
              placeholder="Ex: 123456"
              value={mtr}
              onChange={(e) => setMtr(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={(v) => { if (v) setFormaPagamento(v); }}>
                <SelectTrigger id="forma_pagamento">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex flex-col justify-end">
              <div 
                className={`flex items-center space-x-2 h-10 border rounded-md px-3 cursor-pointer transition-colors ${pago ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                onClick={() => setPago(!pago)}
              >
                <input
                  type="checkbox"
                  id="pago"
                  checked={pago}
                  onChange={(e) => setPago(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <Label htmlFor="pago" className="cursor-pointer font-medium text-slate-700 flex-1">Pago</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading ? "Salvando..." : "Criar Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

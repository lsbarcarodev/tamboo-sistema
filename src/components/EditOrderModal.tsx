"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, Trash2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ClientFormModal } from "./ClientFormModal";
import { NewAddressModal } from "./NewAddressModal";

interface EditOrderModalProps {
  order: any;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export function EditOrderModal({ order, open, setOpen, onSuccess, onDelete }: EditOrderModalProps) {
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
  const [enderecoId, setEnderecoId] = useState("original");
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

  useEffect(() => {
    if (open && order) {
      setClienteId(""); // We'll set it after loading clients
      setEnderecoTexto(order.endereco_entrega || "");
      setTipo(order.tipo || "Colocação");
      setEquipamento(order.equipamento || "Caçamba");
      setEquipamentoId(order.equipamento_id || "");
      
      const valCents = Math.round((order.valor_locacao || 0) * 100);
      setValorLocacaoCents(valCents);
      setValorLocacaoDisplay(valCents > 0 ? (valCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "");
      
      setDataLocacao(order.data_locacao ? order.data_locacao.split('T')[0] : new Date().toISOString().split('T')[0]);
      setDataRetirada(order.data_retirada ? order.data_retirada.split('T')[0] : "");
      
      setMtr(order.mtr || "");
      setFormaPagamento(order.forma_pagamento || "Pix");
      setPago(order.pago || false);
      
      buscarClientes();
    }
  }, [open, order]);

  useEffect(() => {
    if (clientesList.length > 0 && order && order.cliente_nome) {
      // Tenta achar o cliente pelo nome
      const c = clientesList.find(c => c.nome === order.cliente_nome);
      if (c && !clienteId) { // Só carrega se não estiver carregado
        setClienteId(c.id);
        
        // Carrega a lista de endereços desse cliente sem sobrescrever a seleção "original"
        setLoadingEnderecos(true);
        supabase
          .from('st_enderecos')
          .select('*')
          .eq('cliente_id', c.id)
          .order('is_padrao', { ascending: false })
          .then(({ data }) => {
            if (data) {
              setEnderecosList(data);
              
              // Tenta parear o endereço atual com algum da lista
              if (order?.endereco_entrega) {
                let matchedId = null;
                for (const end of data) {
                  const endStr = `${end.logradouro}, ${end.numero}`;
                  if (order.endereco_entrega.includes(endStr)) {
                    matchedId = end.id;
                    break;
                  }
                }
                if (matchedId) {
                  setEnderecoId(matchedId);
                }
              }
            }
            setLoadingEnderecos(false);
          });
      }
    }
  }, [clientesList, order]);

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
      // Reverter seleção visual caso o usuário feche o modal sem salvar (idealmente lidado pelo select)
      return;
    }
    setEnderecoId(id);
    if (id === "original") {
      setEnderecoTexto(order?.endereco_entrega || "");
      return;
    }
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

      const basePayload: any = {
        cliente_id: clienteId,
        cliente_nome: clienteSelecionado?.nome || order?.cliente_nome || 'Cliente não selecionado',
        tipo,
        equipamento,
        endereco_entrega: enderecoTexto,
        updated_by: 'Administrador',
        mtr: mtr || null,
        forma_pagamento: formaPagamento,
        pago: pago,
        valor_locacao: valorLocacaoCents > 0 ? valorLocacaoCents / 100 : null,
      };

      if (dataLocacao) basePayload.data_locacao = `${dataLocacao}T12:00:00Z`;

      if (dataRetirada) {
        basePayload.data_retirada = `${dataRetirada}T12:00:00Z`;
      } else {
        basePayload.data_retirada = null;
      }

      if (equipamentoId) {
        basePayload.equipamento_id = equipamentoId;
        basePayload.equipamento_codigo = equipSelecionado?.codigo_interno || order?.equipamento_codigo || null;
      } else {
        basePayload.equipamento_id = null;
        basePayload.equipamento_codigo = null;
      }

      

      let updateError: any = null;
      let updatePayload: any = { ...basePayload };

      while (true) {
        const { error: err } = await supabase.from('st_locacoes').update(updatePayload).eq('id', order.id);
        if (!err) { updateError = null; break; }
        
        if (err.code === 'PGRST204' || err.message?.includes('schema cache')) {
          const match = err.message.match(/the '([^']+)' column/);
          const missingCol = match?.[1];
          if (missingCol && missingCol in updatePayload) {
            console.warn(`Coluna '${missingCol}' não existe no banco (ou cache desatualizado). Salvando sem ela.`);
            const updated: any = {};
            Object.keys(updatePayload).forEach(k => { if (k !== missingCol) updated[k] = updatePayload[k]; });
            updatePayload = updated;
          } else {
            updateError = err; break;
          }
        } else {
          updateError = err; break;
        }
      }

      if (updateError) throw updateError;
      
      if (equipamentoId && equipamentoId !== order?.equipamento_id) {
        // Atualiza o novo para alocado
        await supabase.from('st_equipamentos').update({ status: 'Alocado' }).eq('id', equipamentoId);
        // Libera o antigo se for diferente
        if (order?.equipamento_id) {
          await supabase.from('st_equipamentos').update({ status: 'Disponível' }).eq('id', order.equipamento_id);
        }
      }
      
      setOpen(false);
      
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error("Erro ao editar pedido:", error);
      alert(`Erro ao salvar o pedido: ${error?.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">Editar Locação</DialogTitle>
          <DialogDescription>
            Edite os detalhes da locação e salve as alterações.
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
                  {enderecoId === "original"
                    ? enderecoTexto || "Endereço não informado"
                    : enderecoId === "manual" 
                      ? "+ Cadastrar Novo Endereço" 
                      : (enderecosList.find(e => e.id === enderecoId) 
                          ? `${enderecosList.find(e => e.id === enderecoId)?.logradouro}, ${enderecosList.find(e => e.id === enderecoId)?.numero}` 
                          : undefined)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} side="bottom">
                {enderecoId === "original" && enderecoTexto && (
                  <SelectItem value="original" className="hidden">
                    <span className="whitespace-normal break-words text-slate-500 italic">
                      Manter Atual: {enderecoTexto}
                    </span>
                  </SelectItem>
                )}
                {enderecosList.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="whitespace-normal break-words">
                      {e.logradouro}, {e.numero} {e.bairro ? `- ${e.bairro}` : ''} {e.is_padrao ? "(Padrão)" : ""}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="manual" className="text-emerald-600 font-medium bg-emerald-50 focus:bg-emerald-100">+ Cadastrar Novo Endereço</SelectItem>
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

          {/* Tipo mascarado — não exibido ao usuário */}
          <input type="hidden" name="tipo" value={tipo} />
          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="equipamento">Tipo de Equipamento</Label>
              <Select value={equipamento} onValueChange={(v) => { if (v) { setEquipamento(v); setEquipamentoId(""); } }}>
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
                      ? (equipamentosList.find((e) => e.id === equipamentoId)?.codigo_interno || order?.equipamento_codigo || (loadingEquips ? "Carregando..." : "Buscar por código..."))
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
                          const isUnavailable = e.status !== 'Disponível' && e.id !== order?.equipamento_id;
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

          {order?.comprovante_url && (
            <div className="grid w-full items-center gap-1.5 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <Label className="font-semibold">Foto do Comprovante (Motorista)</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-center mt-2">
                <div className="relative w-full sm:w-32 h-32 rounded-md overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                  <img src={order.comprovante_url} alt="Comprovante" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex flex-col gap-2 w-full sm:flex-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full gap-2 justify-start"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = order.comprovante_url;
                      link.target = '_blank';
                      link.download = `comprovante_${order.id.substring(0,8)}.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="h-4 w-4" /> Baixar Foto
                  </Button>
                  <Button
                    type="button"
                    className="w-full gap-2 justify-start bg-[#25D366] hover:bg-[#128C7E] text-white"
                    onClick={() => {
                      const clienteSelecionado = clientesList.find(c => c.id === clienteId);
                      const tel = clienteSelecionado?.telefone;
                      if (!tel) {
                        alert("O cliente não tem um telefone cadastrado.");
                        return;
                      }
                      const numbersOnly = tel.replace(/\D/g, '');
                      if (numbersOnly.length < 10) {
                        alert("Telefone inválido.");
                        return;
                      }
                      const mensagem = `Olá ${clienteSelecionado.nome.split(' ')[0]}! Segue o comprovante da ${order.tipo.toLowerCase()} do equipamento. ${order.comprovante_url}`;
                      const whatsappUrl = `https://wa.me/55${numbersOnly}?text=${encodeURIComponent(mensagem)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    Enviar pelo WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex sm:justify-between w-full items-center">
            {onDelete ? (
              <Button type="button" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:mr-auto" onClick={onDelete} disabled={loading} title="Excluir Pedido">
                <Trash2 className="h-5 w-5" />
              </Button>
            ) : <div />}
            <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); }} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, User as UserIcon, Trash2, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCPFOrCNPJ, formatPhone, formatCEP } from "@/lib/utils";

interface ClientFormModalProps {
  onSuccess?: (clienteId?: string) => void;
  editId?: string; // Se fornecido, abre em modo de edição
  openButton?: React.ReactElement;
}

export function ClientFormModal({ onSuccess, editId, openButton }: ClientFormModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Dados Gerais
  const [tipoPessoa, setTipoPessoa] = useState("Jurídica");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [emailResponsavel, setEmailResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  // Múltiplos Endereços
  const [enderecos, setEnderecos] = useState<any[]>([{
    id: "temp_" + Date.now(), // ID temporário para UI
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    is_padrao: true,
    db_id: null // Se for edição e já existir no banco
  }]);

  useEffect(() => {
    if (open && editId) {
      carregarClienteParaEdicao(editId);
    } else if (open && !editId) {
      resetForm();
    }
  }, [open, editId]);

  const carregarClienteParaEdicao = async (id: string) => {
    setLoading(true);
    try {
      // 1. Carregar cliente
      const { data: cliente, error: errC } = await supabase.from('st_clientes').select('*').eq('id', id).single();
      if (errC) throw errC;

      setTipoPessoa(cliente.tipo_pessoa || "Jurídica");
      setNome(cliente.nome);
      setDocumento(cliente.documento || "");
      setNomeResponsavel(cliente.nome_responsavel || "");
      setEmailResponsavel(cliente.email_responsavel || "");
      setTelefone(cliente.telefone || "");

      // 2. Carregar endereços
      const { data: ends, error: errE } = await supabase.from('st_enderecos').select('*').eq('cliente_id', id).order('is_padrao', { ascending: false });
      if (errE) throw errE;

      if (ends && ends.length > 0) {
        setEnderecos(ends.map(e => ({
          ...e,
          db_id: e.id,
          id: "loaded_" + e.id
        })));
      } else {
        // Fallback para endereço desnormalizado antigo
        if (cliente.endereco_padrao) {
          setEnderecos([{
            id: "temp_" + Date.now(),
            cep: "", logradouro: cliente.endereco_padrao, numero: "", complemento: "", bairro: "", cidade: "", uf: "", is_padrao: true, db_id: null
          }]);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar edição:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatCPFOrCNPJ(e.target.value);
    setDocumento(val);

    const justNumbers = val.replace(/\D/g, "");
    if (tipoPessoa === "Jurídica" && justNumbers.length === 14) {
      setBuscandoCnpj(true);
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${justNumbers}`);
        const data = await response.json();
        
        if (data && !data.error) {
          setNome(data.razao_social || data.nome_fantasia || "");
          
          // Se o primeiro endereço estiver vazio, autocompleta
          if (enderecos.length > 0 && !enderecos[0].cep) {
            const cepVindoDaApi = data.cep || "";
            atualizarEndereco(0, "cep", formatCEP(cepVindoDaApi));
            atualizarEndereco(0, "numero", data.numero || "");
            atualizarEndereco(0, "complemento", data.complemento || "");
            
            if (cepVindoDaApi) {
              // Chama o ViaCEP direto para garantir rua/bairro corretos e completos
              buscarCep(0, cepVindoDaApi);
            } else {
              atualizarEndereco(0, "logradouro", data.logradouro || "");
              atualizarEndereco(0, "bairro", data.bairro || "");
              atualizarEndereco(0, "cidade", data.municipio || "");
              atualizarEndereco(0, "uf", data.uf || "");
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar CNPJ:", error);
      } finally {
        setBuscandoCnpj(false);
      }
    }
  };

  const buscarCep = async (index: number, cep: string) => {
    const justNumbers = cep.replace(/\D/g, "");
    if (justNumbers.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${justNumbers}/json/`);
        const data = await response.json();
        if (!data.erro) {
          atualizarEndereco(index, "logradouro", data.logradouro || "");
          atualizarEndereco(index, "bairro", data.bairro || "");
          atualizarEndereco(index, "cidade", data.localidade || "");
          atualizarEndereco(index, "uf", data.uf || "");
          document.getElementById(`numero-${index}`)?.focus();
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const adicionarEndereco = () => {
    setEnderecos([
      ...enderecos, 
      { id: "temp_" + Date.now(), cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", is_padrao: false, db_id: null }
    ]);
  };

  const removerEndereco = async (index: number) => {
    const addr = enderecos[index];
    if (addr.db_id) {
      const confirm = window.confirm("Deseja realmente excluir este endereço do banco de dados?");
      if (!confirm) return;
      await supabase.from('st_enderecos').delete().eq('id', addr.db_id);
    }
    
    const novos = [...enderecos];
    novos.splice(index, 1);
    
    // Garantir que exista um padrão
    if (addr.is_padrao && novos.length > 0) {
      novos[0].is_padrao = true;
    }
    setEnderecos(novos);
  };

  const tornarPadrao = (index: number) => {
    const novos = enderecos.map((e, i) => ({ ...e, is_padrao: i === index }));
    setEnderecos(novos);
  };

  const atualizarEndereco = (index: number, campo: string, valor: string) => {
    setEnderecos(prev => {
      const novos = [...prev];
      novos[index] = { ...novos[index], [campo]: valor };
      return novos;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Previne que o form do NewOrderModal receba esse submit
    setLoading(true);
    
    try {
      const ePadrao = enderecos.find(e => e.is_padrao) || enderecos[0];
      const enderecoFormatado = ePadrao 
        ? `${ePadrao.logradouro}, ${ePadrao.numero}${ePadrao.complemento ? ` - ${ePadrao.complemento}` : ''} - ${ePadrao.bairro} - ${ePadrao.cidade}/${ePadrao.uf} - CEP: ${ePadrao.cep}`
        : "";

      const clienteDataObj = {
        tipo_pessoa: tipoPessoa,
        nome,
        documento,
        nome_responsavel: nomeResponsavel,
        email_responsavel: emailResponsavel,
        telefone,
        endereco_padrao: enderecoFormatado
      };

      let currentClienteId = editId;

      if (editId) {
        const { error } = await supabase.from('st_clientes').update(clienteDataObj).eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('st_clientes').insert([clienteDataObj]).select().single();
        if (error) throw error;
        currentClienteId = data.id;
      }

      // Salvar/Atualizar endereços
      for (const end of enderecos) {
        if (!end.logradouro) continue; // Pula vazios

        const endObj = {
          cliente_id: currentClienteId,
          cep: end.cep,
          logradouro: end.logradouro,
          numero: end.numero,
          complemento: end.complemento,
          bairro: end.bairro,
          cidade: end.cidade,
          uf: end.uf,
          is_padrao: end.is_padrao
        };

        if (end.db_id) {
          await supabase.from('st_enderecos').update(endObj).eq('id', end.db_id);
        } else {
          await supabase.from('st_enderecos').insert([endObj]);
        }
      }
      
      setOpen(false);
      resetForm();
      if (onSuccess) onSuccess(currentClienteId);
      
    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error.message || error);
      alert("Erro ao salvar o cliente. Verifique se o script SQL foi executado corretamente.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTipoPessoa("Jurídica");
    setNome("");
    setDocumento("");
    setNomeResponsavel("");
    setEmailResponsavel("");
    setTelefone("");
    setEnderecos([{ id: "temp_" + Date.now(), cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", is_padrao: true, db_id: null }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          openButton || (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">{editId ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
          <DialogDescription>
            {editId ? "Atualize os dados e endereços do cliente." : "Preencha os dados do cliente e os endereços de entrega."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 pt-2 max-h-[70vh] overflow-y-auto">
            
            {/* COLUNA 1: DADOS GERAIS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <UserIcon className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Dados Principais</h3>
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label>Tipo de Pessoa</Label>
                <Select value={tipoPessoa} onValueChange={(val) => { if (val) { setTipoPessoa(val); setDocumento(""); } }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jurídica">Pessoa Jurídica (CNPJ)</SelectItem>
                    <SelectItem value="Física">Pessoa Física (CPF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid w-full items-center gap-1.5 relative">
                <Label htmlFor="documento">{tipoPessoa === "Jurídica" ? "CNPJ" : "CPF"}</Label>
                <Input 
                  id="documento" 
                  placeholder={tipoPessoa === "Jurídica" ? "00.000.000/0000-00" : "000.000.000-00"}
                  required
                  value={documento}
                  onChange={handleDocumentoChange}
                  maxLength={18}
                />
                {buscandoCnpj && <span className="text-xs text-emerald-600 absolute -bottom-4 left-0">Buscando CNPJ na Receita...</span>}
              </div>

              <div className="grid w-full items-center gap-1.5 pt-2">
                <Label htmlFor="nome">{tipoPessoa === "Jurídica" ? "Razão Social / Nome Fantasia" : "Nome Completo"}</Label>
                <Input 
                  id="nome" 
                  placeholder={tipoPessoa === "Jurídica" ? "Ex: Construtora Silva LTDA" : "Ex: João da Silva"}
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              {tipoPessoa === "Jurídica" && (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="responsavel">Nome do Responsável / Contato</Label>
                  <Input 
                    id="responsavel" 
                    placeholder="Ex: Carlos (Engenheiro)" 
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                  <Input 
                    id="telefone" 
                    placeholder="(00) 90000-0000" 
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    maxLength={15}
                  />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email">E-mail (Responsável)</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="email@empresa.com" 
                    value={emailResponsavel}
                    onChange={(e) => setEmailResponsavel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* COLUNA 2: ENDEREÇOS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Endereços / Obras</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={adicionarEndereco} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Novo Endereço
                </Button>
              </div>

              {enderecos.map((end, index) => (
                <div key={end.id} className={`p-4 rounded-lg border ${end.is_padrao ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'} space-y-4 relative`}>
                  
                  {enderecos.length > 1 && (
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          id={`padrao-${index}`} 
                          name="endereco_padrao" 
                          checked={end.is_padrao} 
                          onChange={() => tornarPadrao(index)}
                        />
                        <Label htmlFor={`padrao-${index}`} className="text-xs cursor-pointer font-medium">Marcar como Principal</Label>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removerEndereco(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid w-full items-center gap-1.5">
                      <Label className="text-xs">CEP</Label>
                      <Input 
                        placeholder="00000-000" 
                        required
                        value={end.cep}
                        onChange={(e) => {
                          const val = formatCEP(e.target.value);
                          atualizarEndereco(index, "cep", val);
                          buscarCep(index, val);
                        }}
                        maxLength={10}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                      <Label className="text-xs">UF</Label>
                      <Input 
                        placeholder="SP" 
                        required
                        value={end.uf}
                        onChange={(e) => atualizarEndereco(index, "uf", e.target.value.toUpperCase())}
                        maxLength={2}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid w-full items-center gap-1.5">
                    <Label className="text-xs">Logradouro (Rua, Av)</Label>
                    <Input 
                      required
                      value={end.logradouro}
                      onChange={(e) => atualizarEndereco(index, "logradouro", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid w-full items-center gap-1.5 col-span-1">
                      <Label className="text-xs">Número</Label>
                      <Input 
                        id={`numero-${index}`}
                        required
                        value={end.numero}
                        onChange={(e) => atualizarEndereco(index, "numero", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid w-full items-center gap-1.5 col-span-2">
                      <Label className="text-xs">Complemento</Label>
                      <Input 
                        placeholder="Sala, Lote..."
                        value={end.complemento}
                        onChange={(e) => atualizarEndereco(index, "complemento", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid w-full items-center gap-1.5">
                      <Label className="text-xs">Bairro</Label>
                      <Input 
                        required
                        value={end.bairro}
                        onChange={(e) => atualizarEndereco(index, "bairro", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                      <Label className="text-xs">Cidade</Label>
                      <Input 
                        required
                        value={end.cidade}
                        onChange={(e) => atualizarEndereco(index, "cidade", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="p-6 border-t bg-slate-50">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading ? "Salvando..." : (editId ? "Salvar Alterações" : "Salvar Novo Cliente")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

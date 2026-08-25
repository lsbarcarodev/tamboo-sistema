"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Camera, CheckCircle, Navigation, Loader2, Package, ChevronRight, ArrowLeft, Check, Search, Trash, MessageCircle, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MotoristaPage() {
  const [activeTab, setActiveTab] = useState<'fazer' | 'concluidos'>('fazer');
  const [tarefasPendentes, setTarefasPendentes] = useState<any[]>([]);
  const [tarefasConcluidas, setTarefasConcluidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sheet states (Usando um layout customizado de tela cheia para simular navegação SPX)
  const [activeTarefa, setActiveTarefa] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Estados da Foto
  const [tempPhoto, setTempPhoto] = useState<File | null>(null);
  const [tempPhotoPreview, setTempPhotoPreview] = useState<string | null>(null);
  
  // State for equipment selection
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [selectedEquipamento, setSelectedEquipamento] = useState<Record<string, string>>({});
  const [driverProfile, setDriverProfile] = useState<any | null>(null);
  const driverProfileRef = useRef<any>(null); // ref para evitar closure stale no realtime

  // Sincroniza o ref sempre que o state mudar
  useEffect(() => { driverProfileRef.current = driverProfile; }, [driverProfile]);

  const shopeeOrange = "#EE4D2D";

  useEffect(() => {
    fetchTarefas();
    fetchEquipamentos();

    // Realtime: dispara fetchTarefas sempre usando o ref (sem closure stale)
    const channel = supabase
      .channel('motorista_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'st_locacoes' },
        () => {
          fetchTarefas(driverProfileRef.current);
        }
      )
      .subscribe();

    // Reconecta ao voltar do background (PWA instalado)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchTarefas(driverProfileRef.current);
        fetchEquipamentos();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const fetchTarefas = async (profile = driverProfile) => {
    setLoading(true);
    try {
      let activeProfile = profile;
      
      // Se não tiver o perfil em cache, busca agora
      if (!activeProfile) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from('st_motoristas')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          if (data) {
            activeProfile = data;
            setDriverProfile(data);
          }
        }
      }

      let query = supabase
        .from("st_locacoes")
        .select('*, st_clientes(telefone)')
        .in('status', ['Pendente', 'Retirada', 'Atrasado', 'Alocado', 'Finalizado']);

      // Se for um motorista identificado, filtra apenas os despachados para ele
      if (activeProfile) {
        query = query.eq('motorista_id', activeProfile.id);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;
      
      const hoje = new Date();
      hoje.setHours(0,0,0,0);

      // Transforma tarefas "Alocadas" (Entregues) que já passaram da data de devolução em tarefas de "Retirada"
      const dadosMapeados = (data || []).map(t => {
         const tClone = { ...t };
         if (t.tipo === 'Colocação' && (t.status === 'Alocado' || t.status === 'Pendente') && t.data_retirada) {
            const dataRet = new Date(t.data_retirada);
            dataRet.setHours(0,0,0,0);
            if (dataRet <= hoje) {
               tClone.tipo = 'Retirada';
               if (t.status === 'Alocado') {
                  tClone.status = 'Retirada';
               }
            }
         }
         return tClone;
      });

      // Filtra as Pendentes
      const pendentes = dadosMapeados.filter(t => {
        if (!['Pendente', 'Retirada', 'Atrasado'].includes(t.status)) return false;
        
        let dataAlvoStr = t.data_locacao;
        if (t.tipo === 'Retirada' && t.data_retirada) dataAlvoStr = t.data_retirada;
        
        if (!dataAlvoStr) return true;
        const dataAlvo = new Date(dataAlvoStr);
        dataAlvo.setHours(0,0,0,0);
        return dataAlvo <= hoje;
      });
      
      // Filtra as Concluídas de HOJE
      const concluidas = dadosMapeados.filter(t => {
        if (!['Alocado', 'Finalizado'].includes(t.status)) return false;
        const dataAtt = new Date(t.updated_at);
        dataAtt.setHours(0,0,0,0);
        return dataAtt.getTime() === hoje.getTime();
      });
      
      // Ordena pendentes por horário (os primeiros primeiro, os sem horário no final)
      pendentes.sort((a, b) => {
        if (!a.horario && !b.horario) return 0;
        if (!a.horario) return 1;
        if (!b.horario) return -1;
        return a.horario.localeCompare(b.horario);
      });
      
      setTarefasPendentes(pendentes);
      setTarefasConcluidas(concluidas);

    } catch (err) {
      console.error("Erro ao carregar tarefas:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipamentos = async () => {
    try {
      const { data } = await supabase
        .from("st_equipamentos")
        .select('*')
        .eq('status', 'Disponível')
        .order('codigo_interno');
      if (data) setEquipamentos(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadAndComplete = async (tarefa: any, file: File) => {
    setProcessingId(tarefa.id);
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const fileName = `${tarefa.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file);

      if (uploadError) throw new Error("Erro no upload da foto: " + uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      const comprovante_url = publicUrlData.publicUrl;

      // Colocação → Alocado (Entregue), Retirada → Finalizado
      let novoStatus = 'Alocado';
      if (tarefa.tipo === 'Retirada') novoStatus = 'Finalizado';

      let equipIdToSave = tarefa.equipamento_id;
      let equipCodigoToSave = tarefa.equipamento_codigo;
      const motoristaEquipSelectionId = selectedEquipamento[tarefa.id];
      
      if (motoristaEquipSelectionId) {
        const equipDetail = equipamentos.find(e => e.id === motoristaEquipSelectionId);
        if (equipDetail) {
          equipIdToSave = equipDetail.id;
          equipCodigoToSave = equipDetail.codigo_interno;
        }
      }

      const updatePayload: any = { 
        status: novoStatus,
        comprovante_url,
        comprovante_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: driverProfile?.nome || 'Motorista'
      };

      if (equipIdToSave) {
        updatePayload.equipamento_id = equipIdToSave;
        updatePayload.equipamento_codigo = equipCodigoToSave;
      }

      const { error: updateError } = await supabase
        .from('st_locacoes')
        .update(updatePayload)
        .eq('id', tarefa.id);

      if (updateError) throw new Error("Erro ao atualizar status: " + updateError.message);

      if (equipIdToSave) {
        const equipStatus = novoStatus === 'Alocado' ? 'Alocado' : novoStatus === 'Finalizado' ? 'Disponível' : null;
        if (equipStatus) {
          await supabase.from('st_equipamentos').update({ status: equipStatus }).eq('id', equipIdToSave);
        }
      }
      
      // Se é Retirada com equipamento vinculado = era uma troca → gera nova Locação
      const eratroca = tarefa.tipo === 'Retirada' && tarefa.equipamento_id;
      if (eratroca) {
         // Libera a caçamba retirada
         await supabase.from('st_equipamentos').update({ status: 'Disponível' }).eq('id', tarefa.equipamento_id);
         
         // Gera uma NOVA locação (Colocação) para o mesmo cliente/motorista
         const novaLocacao = {
            empresa_id: tarefa.empresa_id,
            cliente_id: tarefa.cliente_id,
            cliente_nome: tarefa.cliente_nome,
            equipamento: tarefa.equipamento,
            quantidade: tarefa.quantidade,
            tipo: 'Colocação',
            status: 'Pendente',
            endereco_entrega: tarefa.endereco_entrega,
            lat: tarefa.lat,
            lng: tarefa.lng,
            motorista_id: tarefa.motorista_id,
            valor_locacao: tarefa.valor_locacao || 0,
            data_locacao: new Date().toISOString().split('T')[0],
            updated_by: driverProfile?.nome || 'Motorista'
         };
         
         await supabase.from('st_locacoes').insert(novaLocacao);
      }

      // Move to completed
      const tarefaConcluida = { ...tarefa, ...updatePayload };
      setTarefasPendentes(prev => prev.filter(t => t.id !== tarefa.id));
      setTarefasConcluidas(prev => [tarefaConcluida, ...prev]);
      setActiveTarefa(null);
      setTempPhoto(null);
      setTempPhotoPreview(null);
      
    } catch (err: any) {
      console.error("Erro ao processar:", err);
      alert(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setProcessingId(null);
    }
  };

  const openMaps = (endereco: string) => {
    const url = `https://maps.google.com/?q=${encodeURIComponent(endereco)}`;
    window.open(url, "_blank");
  };

  const openWhatsApp = (phone: string | undefined | null) => {
    if (!phone) {
      alert("Telefone do cliente não cadastrado.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  // Cores de Tag SPX
  // Colocação = Locação (verde), Retirada e Troca = Retirada (vermelho)
  const getTagColor = (tipo: string) => {
    if (tipo === 'Retirada' || tipo === 'Troca') return 'border-rose-200 text-rose-600 bg-rose-50';
    return 'border-emerald-200 text-emerald-600 bg-emerald-50';
  };

  const isRetirada = (tarefa: any) => tarefa.tipo === 'Retirada' || tarefa.tipo === 'Troca';

  const getLabelOperacao = (tarefa: any) => {
    if (isRetirada(tarefa)) return `RETIRADA ${tarefa.equipamento || ''}`;
    return `LOCAÇÃO ${tarefa.equipamento || ''}`;
  };

  const tarefasAtuais = activeTab === 'fazer' ? tarefasPendentes : tarefasConcluidas;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F5F5F5] font-sans relative overflow-hidden">
      
      {/* HEADER SPX */}
      <header className="bg-white shadow-sm z-10 shrink-0">
        <div className="pt-6 pb-3 px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Rota de Entregas</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchTarefas()} 
              disabled={loading}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#EE4D2D]' : ''}`} />
            </button>
            <Search className="w-5 h-5 text-slate-500 ml-1" />
          </div>
        </div>
        
        {/* TABS SPX */}
        <div className="flex border-b border-slate-200">
          <button 
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${activeTab === 'fazer' ? 'text-[#EE4D2D]' : 'text-slate-500'}`}
            onClick={() => setActiveTab('fazer')}
          >
            A Fazer ({tarefasPendentes.length})
            {activeTab === 'fazer' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#EE4D2D] rounded-t-md"></div>
            )}
          </button>
          <button 
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${activeTab === 'concluidos' ? 'text-[#EE4D2D]' : 'text-slate-500'}`}
            onClick={() => setActiveTab('concluidos')}
          >
            Concluídos ({tarefasConcluidas.length})
            {activeTab === 'concluidos' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#EE4D2D] rounded-t-md"></div>
            )}
          </button>
        </div>
      </header>

      {/* LISTA DE CARDS SPX */}
      <main className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-[#EE4D2D]" />
          </div>
        ) : tarefasAtuais.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-500">Nenhum pacote por aqui</p>
          </div>
        ) : (
          tarefasAtuais.map((tarefa) => (
            <div 
              key={tarefa.id} 
              className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden active:scale-[0.99] transition-transform cursor-pointer shrink-0"
              onClick={() => { if (activeTab === 'fazer') setActiveTarefa(tarefa); }}
            >
              {/* Card Header */}
              <div className="px-4 py-3 border-b border-dashed border-slate-200 flex justify-between items-center gap-2">
                <span 
                  className={`px-2 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-wider truncate shrink-0 max-w-[150px] ${getTagColor(tarefa.tipo)}`}
                  title={getLabelOperacao(tarefa)}
                >
                  {getLabelOperacao(tarefa)}
                </span>
                
                {activeTab === 'fazer' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {tarefa.horario && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md mr-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {tarefa.horario}
                      </span>
                    )}
                    <button 
                      type="button"
                      className="p-2 text-slate-400 hover:text-emerald-500 rounded-full hover:bg-emerald-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsApp(tarefa.st_clientes?.telefone);
                      }}
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button 
                      type="button"
                      className="p-2 -mr-2 text-slate-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMaps(tarefa.endereco_entrega);
                      }}
                      title="Navegar com GPS"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Card Body */}
              <div className="p-4" onClick={() => { if (activeTab === 'fazer') setActiveTarefa(tarefa); }}>
                <h3 className="text-base font-bold text-slate-800 leading-tight mb-2">
                  {tarefa.cliente_nome || 'Cliente Desconhecido'}
                </h3>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-600 line-clamp-2 leading-snug">
                    {tarefa.endereco_entrega || 'Endereço não cadastrado'}
                  </p>
                </div>
              </div>
              
              {/* Card Footer com Botão */}
              {activeTab === 'fazer' ? (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <Button 
                    className="bg-[#EE4D2D] hover:bg-[#D74022] text-white rounded-full h-9 px-5 font-bold text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTarefa(tarefa);
                    }}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              ) : (
                <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between">
                   <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                     <CheckCircle className="w-3.5 h-3.5" />
                     Concluído
                   </span>
                   <span className="text-xs text-emerald-600 font-medium">
                     {new Date(tarefa.updated_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                   </span>
                </div>
              )}
            </div>
          ))
        )}
      </main>

      {/* FULL SCREEN MODAL - SPX FLOW */}
      {activeTarefa && (
        <div className="absolute inset-0 z-50 bg-[#F5F5F5] flex flex-col animate-in slide-in-from-right-8 duration-200">
          
          {/* Header do Modal */}
          <header className="bg-white shadow-sm flex items-center px-4 h-14 shrink-0">
            <button 
              className="p-2 -ml-2 rounded-full hover:bg-slate-100"
              onClick={() => { setActiveTarefa(null); setTempPhoto(null); setTempPhotoPreview(null); }}
            >
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <h2 className="ml-2 text-lg font-bold text-slate-800">Detalhes da Parada</h2>
          </header>

          <main className="flex-1 overflow-y-auto pb-32">
            {/* Info do Cliente */}
            <div className="bg-white p-5 shadow-sm border-b border-slate-200 mb-3">
               <span 
                 className={`inline-block px-2 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-wider mb-2 max-w-full truncate ${getTagColor(activeTarefa.tipo)}`}
                 title={getLabelOperacao(activeTarefa)}
               >
                  {getLabelOperacao(activeTarefa)}
               </span>
               <h2 className="text-xl font-bold text-slate-900 leading-tight">
                 {activeTarefa.cliente_nome}
               </h2>
               <div className="flex items-start gap-2 mt-3 text-slate-600">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                  <p className="text-sm font-medium">{activeTarefa.endereco_entrega}</p>
               </div>
            </div>

            {/* Ações (Rotas e Seleção) */}
            <div className="px-4 flex flex-col gap-3 mt-4">
              
              <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold shadow-sm"
                    onClick={() => openWhatsApp(activeTarefa.st_clientes?.telefone)}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold shadow-sm"
                    onClick={() => openMaps(activeTarefa.endereco_entrega)}
                  >
                    <Navigation className="w-5 h-5 mr-2" />
                    GPS
                  </Button>
              </div>

              {!isRetirada(activeTarefa) ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 mt-1">
                   <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                     <Package className="w-4 h-4 text-[#EE4D2D]" />
                     Vincular Equipamento
                   </h3>
                   <p className="text-xs text-slate-500 font-medium -mt-1">
                     Qual {activeTarefa.equipamento} será deixada nesta obra?
                   </p>
                   <select 
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg h-12 px-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#EE4D2D] outline-none"
                      value={selectedEquipamento[activeTarefa.id] !== undefined ? selectedEquipamento[activeTarefa.id] : (activeTarefa.equipamento_id || '')}
                      onChange={(e) => setSelectedEquipamento({...selectedEquipamento, [activeTarefa.id]: e.target.value})}
                    >
                      <option value="">Toque para selecionar...</option>
                      {activeTarefa.equipamento_id && !equipamentos.some(e => e.id === activeTarefa.equipamento_id) && (
                         <option value={activeTarefa.equipamento_id}>{activeTarefa.equipamento_codigo || 'Equipamento Atual'}</option>
                      )}
                      {equipamentos.filter(eq => eq.tipo === activeTarefa.equipamento || eq.tipo === 'Caçamba').map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.codigo_interno}</option>
                      ))}
                    </select>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-1">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center shrink-0">
                       <Package className="w-5 h-5 text-rose-500" />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-slate-800">Recolhendo {activeTarefa.equipamento}</p>
                       <p className="text-xs text-slate-500 font-medium">Nº: {activeTarefa.equipamento_codigo || 'Não informado'}</p>
                     </div>
                   </div>
                   <p className="text-[11px] text-rose-500 font-semibold mt-1">
                     ⚡ Após a retirada, uma nova Locação será gerada automaticamente.
                   </p>
                </div>
              )}
            </div>
          </main>

          {/* Footer de Ação Fixa SPX */}
          <div className="bg-white p-4 border-t border-slate-200 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] absolute bottom-0 left-0 w-full z-20">
            
            {tempPhotoPreview ? (
              <div className="flex flex-col gap-3">
                 <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-200 relative bg-black flex items-center justify-center">
                    <img src={tempPhotoPreview} className="max-h-full object-contain" />
                 </div>
                 <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="h-14 w-14 shrink-0 rounded-lg text-rose-500 border-slate-300 bg-white hover:bg-rose-50"
                      onClick={() => { setTempPhoto(null); setTempPhotoPreview(null); }}
                      disabled={processingId === activeTarefa.id}
                    >
                      <Trash className="w-6 h-6" />
                    </Button>
                    <Button 
                      type="button"
                      className="h-14 flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[15px] shadow-md transition-all"
                      disabled={processingId === activeTarefa.id}
                      onClick={() => {
                         if (tempPhoto) handleUploadAndComplete(activeTarefa, tempPhoto);
                      }}
                    >
                      {processingId === activeTarefa.id ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          Concluir Entrega
                        </>
                      )}
                    </Button>
                 </div>
              </div>
            ) : (
              <div className="relative w-full">
                <Button 
                  type="button"
                  disabled={processingId === activeTarefa.id || (!isRetirada(activeTarefa) && !selectedEquipamento[activeTarefa.id] && !activeTarefa.equipamento_id)}
                  className="w-full h-14 rounded-lg bg-[#EE4D2D] hover:bg-[#D74022] text-white font-bold text-[15px] disabled:bg-slate-300 shadow-md transition-all"
                >
                  {processingId === activeTarefa.id ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mr-2" />
                      {!isRetirada(activeTarefa) ? 'Tirar Foto da Entrega' : 'Tirar Foto da Retirada'}
                    </>
                  )}
                </Button>
                
                {!processingId && (!(!isRetirada(activeTarefa) && !selectedEquipamento[activeTarefa.id] && !activeTarefa.equipamento_id)) && (
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-[100]"
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setTempPhoto(file);
                        setTempPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                )}
              </div>
            )}
            
            {!tempPhotoPreview && (!isRetirada(activeTarefa) && !selectedEquipamento[activeTarefa.id] && !activeTarefa.equipamento_id) && (
              <p className="text-center text-[11px] text-[#EE4D2D] mt-2 font-semibold">
                Selecione o equipamento acima para liberar a foto.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

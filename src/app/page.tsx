"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ThumbsUp,
  ThumbsDown,
  ArrowDownRight, 
  ArrowUpRight, 
  Package, 
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Trash2,
  Camera,
  Download,
  RefreshCw,
  Search,
  X,
  DollarSign
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NewOrderModal } from "@/components/NewOrderModal";
import { EditOrderModal } from "@/components/EditOrderModal";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Locacao = {
  id: string;
  cliente_nome: string;
  equipamento: string;

  tipo: string;
  status: string;
  endereco_entrega: string;
  created_at: string;
  data_locacao: string;
  data_retirada?: string;
  updated_at?: string;
  updated_by?: string;
  comprovante_url?: string;
  comprovante_at?: string;
  mtr?: string;
  forma_pagamento?: string;
  pago?: boolean;
  financeiro_lancamento_id?: string;
  motorista_id?: string;
  horario?: string;
};

export default function LocacoesPage() {
  const [pedidos, setPedidos] = useState<Locacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Locacao | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Locacao | null>(null);
  const [orderToTroca, setOrderToTroca] = useState<Locacao | null>(null);
  const [trocaDataRetirada, setTrocaDataRetirada] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [interactedOrders, setInteractedOrders] = useState<Set<string>>(new Set());
  const [cacambasDisponiveis, setCacambasDisponiveis] = useState<number>(0);
  const [tamboresDisponiveis, setTamboresDisponiveis] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [pendingPaymentFilter, setPendingPaymentFilter] = useState(false);

  // Estados de motoristas
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [orderToDispatch, setOrderToDispatch] = useState<any>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  useEffect(() => {
    if (orderToDispatch && selectedDriverId) {
      let dataBaseStr = orderToDispatch.data_locacao;
      if (orderToDispatch.tipo === 'Retirada' && orderToDispatch.data_retirada) dataBaseStr = orderToDispatch.data_retirada;
      if (!dataBaseStr && orderToDispatch.created_at) dataBaseStr = orderToDispatch.created_at;
      
      const dataFormatada = dataBaseStr ? dataBaseStr.split('T')[0] : new Date().toISOString().split('T')[0];
    }
  }, [orderToDispatch, selectedDriverId, pedidos]);

  const fetchDisponibilidade = async () => {
    try {
      const { data, error } = await supabase
        .from('st_equipamentos')
        .select('tipo, id')
        .eq('status', 'Disponível');
        
      if (!error && data) {
        setCacambasDisponiveis(data.filter(e => e.tipo === 'Caçamba').length);
        setTamboresDisponiveis(data.filter(e => e.tipo === 'Tambor').length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPedidos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('st_locacoes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPedidos(data || []);
      
      // Update selected order if it's currently open
      setSelectedOrder(prev => {
        if (prev) {
          const updated = data?.find(p => p.id === prev.id);
          return updated || prev;
        }
        return prev;
      });
      
      fetchDisponibilidade();
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error.message || error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMotoristas = async () => {
    try {
      const { data } = await supabase
        .from('st_motoristas')
        .select('*')
        .order('nome', { ascending: true });
      setMotoristas(data || []);
    } catch (e) {
      console.error("Erro ao buscar motoristas:", e);
    }
  };

  useEffect(() => {
    fetchPedidos();
    fetchMotoristas();

    // Configurar Atualização em Tempo Real (Realtime)
    const channel = supabase
      .channel('realtime_locacoes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'st_locacoes' },
        () => {
          fetchPedidos(true);
        }
      )
      .subscribe();

    // Reconecta quando volta do background (PWA)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPedidos(true);
        fetchMotoristas();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getDisplayStatus = (pedido: Locacao) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Atraso na ENTREGA: pedido pendente e data de locação já passou
    if (pedido.status === 'Pendente' && pedido.data_locacao) {
      const datePart = pedido.data_locacao.split('T')[0];
      const dataLoc = new Date(datePart + "T00:00:00");
      if (dataLoc < today) {
        return 'Atrasado';
      }
    }

    // Atraso na RETIRADA: equipamento alocado e data de retirada já passou
    if (pedido.status === 'Alocado' && pedido.data_retirada) {
      const datePart = pedido.data_retirada.split('T')[0];
      const dataRet = new Date(datePart + "T00:00:00");
      if (dataRet < today) {
        return 'Atrasado';
      }
    }

    return pedido.status;
  };

  const moverPedido = async (id: string, novoStatus: string, assignedDriverId?: string, isTroca?: boolean) => {
    try {
      let updatePayload: any = { status: novoStatus };
        // Troca → salva como 'Retirada' (troca não existe mais como tipo separado)
        updatePayload.tipo = 'Retirada';

      // Se foi passado motorista ou se só existe um cadastrado, vincula
      if (assignedDriverId) {
        updatePayload.motorista_id = assignedDriverId;
      } else if (novoStatus === 'Alocado' && motoristas.length === 1) {
        updatePayload.motorista_id = motoristas[0].id;
      }

      let { error } = await supabase
        .from('st_locacoes')
        .update(updatePayload)
        .eq('id', id);
      
      if (error) throw error;

      // Tenta atualizar campos de rastreamento (silenciosamente, caso existam)
      try {
        await supabase
          .from('st_locacoes')
          .update({ updated_at: new Date().toISOString(), updated_by: 'Administrador' })
          .eq('id', id);
      } catch (_) {}

      // Sincroniza status do equipamento vinculado automaticamente
      const pedido = pedidos.find(p => p.id === id) as any;
      if (pedido?.equipamento_id) {
        const equipStatus = novoStatus === 'Alocado' ? 'Alocado' : novoStatus === 'Finalizado' ? 'Disponível' : null;
        if (equipStatus) {
          await supabase.from('st_equipamentos').update({ status: equipStatus }).eq('id', pedido.equipamento_id);
        }
      }

      fetchPedidos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status do pedido.");
    }
  };

  const vincularMotorista = async (id: string, driverId: string) => {
    try {
      const payload: any = { motorista_id: driverId };

      const { error } = await supabase
        .from('st_locacoes')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      fetchPedidos(true);
    } catch (error) {
      console.error("Erro ao vincular motorista:", error);
      alert("Erro ao vincular motorista.");
    }
  };

  const togglePagamento = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('st_locacoes')
        .update({ pago: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state for immediate feedback
      setPedidos(pedidos.map(p => p.id === id ? { ...p, pago: !currentStatus } : p));
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      alert("Erro ao atualizar status de pagamento.");
    }
  };

  const handleSaveTroca = async () => {
    if (!orderToTroca) return;
    try {
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const todayLocal = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
      
      const payload: any = {
        status: 'Alocado',
        tipo: 'Colocação',
        data_locacao: `${todayLocal}T12:00:00Z`,
        updated_at: new Date().toISOString(),
        updated_by: 'Administrador'
      };

      if (trocaDataRetirada) {
        payload.data_retirada = `${trocaDataRetirada}T12:00:00Z`;
      } else {
        payload.data_retirada = null;
      }

      const { error } = await supabase
        .from('st_locacoes')
        .update(payload)
        .eq('id', orderToTroca.id);

      if (error) throw error;
      fetchPedidos();
      setOrderToTroca(null);
    } catch (error) {
      console.error("Erro ao salvar troca", error);
      alert("Erro ao registrar a troca.");
    }
  };

  const excluirPedido = async (id: string) => {
    try {
      // Libera o equipamento vinculado antes de excluir
      const pedido = pedidos.find(p => p.id === id) as any;
      if (pedido?.equipamento_id) {
        await supabase.from('st_equipamentos').update({ status: 'Disponível' }).eq('id', pedido.equipamento_id);
      }
      

      const { error } = await supabase
        .from('st_locacoes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setPedidos(pedidos.filter(p => p.id !== id));
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Erro ao excluir o pedido.");
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao baixar:', error);
      window.open(url, '_blank'); // fallback caso haja erro de CORS
    }
  };

  const totalCount = pedidos.length;
  const pendentesCount = pedidos.filter(p => getDisplayStatus(p) === 'Pendente').length;
  const alocadasCount = pedidos.filter(p => getDisplayStatus(p) === 'Alocado').length;
  const retiradaCount = pedidos.filter(p => getDisplayStatus(p) === 'Retirada').length;
  const atrasadasCount = pedidos.filter(p => getDisplayStatus(p) === 'Atrasado').length;
  const finalizadosCount = pedidos.filter(p => getDisplayStatus(p) === 'Finalizado').length;

  const toggleFilter = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter(null);
    } else {
      setStatusFilter(status);
    }
  };

  const hasUnseenAtrasados = pedidos.some(p => {
    return getDisplayStatus(p) === 'Atrasado' && !interactedOrders.has(p.id);
  });

  const hasUnseenRetirada = pedidos.some(p => {
    if (getDisplayStatus(p) !== 'Retirada') return false;
    const updateDateStr = p.updated_at || p.created_at;
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const todayLocal = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    const updateLocal = updateDateStr ? updateDateStr.split('T')[0] : todayLocal;
    return updateLocal < todayLocal && !interactedOrders.has(p.id);
  });

  const filteredPedidos = pedidos.filter(p => {
    // 1. Filtro de Status
    if (statusFilter && getDisplayStatus(p) !== statusFilter) return false;
    
    // 2. Filtro de Busca (Nome, Equipamento, Endereço/Obra)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNome = p.cliente_nome?.toLowerCase().includes(term);
      const matchEquip = p.equipamento?.toLowerCase().includes(term);
      const matchEnd = p.endereco_entrega?.toLowerCase().includes(term);
      if (!matchNome && !matchEquip && !matchEnd) return false;
    }

    // 3. Filtro de Data
    if (dateFilter) {
      const dateLocMatch = p.data_locacao?.startsWith(dateFilter);
      const dateRetMatch = p.data_retirada?.startsWith(dateFilter);
      const createdAtMatch = p.created_at?.startsWith(dateFilter);
      if (!dateLocMatch && !dateRetMatch && !createdAtMatch) return false;
    }

    // 4. Filtro de Pagamentos Pendentes
    if (pendingPaymentFilter) {
      if (p.pago) return false;
    }

    // 5. Ocultar Finalizados por padrão (a menos que estejamos buscando ou vendo pagamentos pendentes, nesse caso mostraremos finalizados inadimplentes também se desejado, mas vamos manter a regra base para não poluir)
    if (!statusFilter && !searchTerm && !pendingPaymentFilter) {
      const st = getDisplayStatus(p);
      if (st === 'Finalizado') return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-4rem)]">
      
      {/* Search Bar no topo */}
      <div className="w-full relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar cliente, obra ou pedido..."
          className="pl-10 h-12 bg-white text-base shadow-sm border-slate-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Central de Operação</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shadow-sm">
              <Package className="h-3 w-3 mr-1" />
              {cacambasDisponiveis} Caçambas disponíveis
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm">
              <Package className="h-3 w-3 mr-1" />
              {tamboresDisponiveis} Tambores disponíveis
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-3 pb-1">
          {(searchTerm || dateFilter || statusFilter || pendingPaymentFilter) && (
            <Button 
              variant="outline" 
              className="gap-2 text-slate-600 bg-white hover:bg-slate-50 border-slate-300"
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
                setStatusFilter(null);
                setPendingPaymentFilter(false);
              }}
            >
              <X className="h-4 w-4" />
              Desativar filtros
            </Button>
          )}
          
          <div className="flex items-center bg-white border border-slate-200 rounded-md px-3 h-10 shadow-sm focus-within:ring-2 focus-within:ring-slate-400 focus-within:border-transparent transition-all">
            <Calendar className="h-4 w-4 text-slate-500 mr-2" />
            <input
              type="date"
              className="bg-transparent border-none outline-none text-sm text-slate-700 h-full cursor-pointer min-w-[130px]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          
          <div 
            className={`flex items-center space-x-2 h-10 border rounded-md px-3 cursor-pointer transition-colors ${pendingPaymentFilter ? 'bg-amber-50 border-amber-300 shadow-inner' : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50'}`}
            onClick={() => {
              setPendingPaymentFilter(!pendingPaymentFilter);
              // Desativamos o statusFilter de Finalizado se estiver ativo para evitar confusão
              if (statusFilter === 'Finalizado' && !pendingPaymentFilter) setStatusFilter(null);
            }}
          >
            <DollarSign className={`h-4 w-4 ${pendingPaymentFilter ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className={`text-sm font-medium ${pendingPaymentFilter ? 'text-amber-700' : 'text-slate-600'} select-none whitespace-nowrap`}>Pendentes</span>
          </div>
          
          <NewOrderModal onSuccess={fetchPedidos} />
        </div>
      </div>

      {/* Metrics Row - 5 cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'Pendente' ? 'ring-2 ring-slate-400 shadow-md bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
          onClick={() => toggleFilter('Pendente')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Ordens de Locação</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{pendentesCount}</div>
            <p className="text-xs text-slate-500">Novos pedidos</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'Alocado' ? 'ring-2 ring-blue-400 shadow-md bg-blue-50/50' : 'bg-white hover:bg-slate-50'}`}
          onClick={() => toggleFilter('Alocado')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Alocadas</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{alocadasCount}</div>
            <p className="text-xs text-slate-500">No cliente</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'Retirada' ? 'ring-2 ring-yellow-400 shadow-md bg-yellow-50/50' : 'bg-white hover:bg-slate-50'}`}
          onClick={() => {
            toggleFilter('Retirada');
            if (hasUnseenRetirada) {
              const retiradaIds = pedidos.filter(p => getDisplayStatus(p) === 'Retirada').map(p => p.id);
              setInteractedOrders(prev => new Set([...prev, ...retiradaIds]));
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Retirada</CardTitle>
            <div className="relative">
              <Package className="h-4 w-4 text-yellow-500" />
              {hasUnseenRetirada && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{retiradaCount}</div>
            <p className="text-xs text-slate-500">Solicitações de retirada</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'Atrasado' ? 'ring-2 ring-red-400 shadow-md bg-red-50/50' : 'bg-white hover:bg-slate-50'} ${hasUnseenAtrasados ? 'animate-pulse border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''}`}
          onClick={() => {
            toggleFilter('Atrasado');
            if (hasUnseenAtrasados) {
              const atrasadosIds = pedidos.filter(p => getDisplayStatus(p) === 'Atrasado').map(p => p.id);
              setInteractedOrders(prev => new Set([...prev, ...atrasadosIds]));
            }
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Atrasadas</CardTitle>
            <div className="relative">
              <CheckCircle2 className="h-4 w-4 text-red-500" />
              {hasUnseenAtrasados && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{atrasadasCount}</div>
            <p className="text-xs text-slate-500">Requer atenção</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'Finalizado' ? 'ring-2 ring-emerald-400 shadow-md bg-emerald-50/50' : 'bg-white hover:bg-slate-50'}`}
          onClick={() => toggleFilter('Finalizado')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-600">Finalizadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{finalizadosCount}</div>
            <p className="text-xs text-slate-500">Concluídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Grid */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[110px]">Locação</TableHead>
                <TableHead className="w-[110px]">Retirada</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                    Carregando operações...
                  </TableCell>
                </TableRow>
              ) : filteredPedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPedidos.map((pedido) => {
                  const displayStatus = getDisplayStatus(pedido);
                  
                  const isAtrasado = displayStatus === 'Atrasado';

                  let displayTipo = pedido.tipo;
                  let isRetiradaDay = false;
                  if (pedido.data_retirada && displayStatus !== 'Finalizado' && pedido.tipo === 'Colocação') {
                    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                    const todayLocal = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
                    const retDate = pedido.data_retirada.split('T')[0];
                    if (todayLocal >= retDate) {
                      displayTipo = 'Retirada';
                      isRetiradaDay = true;
                    }
                  }

                  return (
                  <TableRow 
                    key={pedido.id} 
                    className={`cursor-pointer transition-colors ${isAtrasado ? 'bg-red-50/50 hover:bg-red-100/50' : 'hover:bg-slate-50'}`}
                    onClick={() => {
                      setSelectedOrder(pedido);
                      setInteractedOrders(prev => new Set(prev).add(pedido.id));
                    }}
                  >
                    <TableCell className="font-medium text-slate-600 text-xs whitespace-nowrap">{pedido.data_locacao ? formatDate(pedido.data_locacao) : '-'}</TableCell>
                    <TableCell className="font-medium text-slate-600 text-xs whitespace-nowrap">{pedido.data_retirada ? formatDate(pedido.data_retirada) : '-'}</TableCell>
                    <TableCell className="font-semibold text-slate-900" title={pedido.cliente_nome}>
                      {pedido.cliente_nome.length > 20 ? pedido.cliente_nome.substring(0, 20) + '...' : pedido.cliente_nome}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${isRetiradaDay ? 'animate-[pulse_1s_ease-in-out_infinite]' : ''}`}>
                        <div className={`p-1 rounded-full ${
                          displayTipo === 'Colocação' ? 'bg-emerald-100 text-emerald-600' :
                          displayTipo === 'Troca' ? 'bg-blue-100 text-blue-600' :
                          'bg-amber-100 text-amber-700'
                        } ${isRetiradaDay ? 'ring-2 ring-amber-500 bg-amber-200' : ''}`}>
                          {displayTipo === 'Colocação' ? <ArrowDownRight className="h-3 w-3" /> :
                           displayTipo === 'Troca' ? <Package className="h-3 w-3" /> :
                           <ArrowUpRight className="h-3 w-3" />}
                        </div>
                        <span className={`text-sm ${isRetiradaDay ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>
                          {displayTipo === 'Colocação' ? 'Locação' : displayTipo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {pedido.equipamento}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {pedido.updated_at ? formatDateTime(pedido.updated_at) : formatDateTime(pedido.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {(() => {
                        const motoristaObj = motoristas.find(m => m.id === (pedido as any).motorista_id);
                        if (motoristaObj) {
                          return (
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5 text-emerald-600" />
                              {motoristaObj.nome}
                            </span>
                          );
                        }
                        
                        if (motoristas.length > 0 && (!pedido.motorista_id || pedido.motorista_id === null) && (pedido.status === 'Pendente' || pedido.status === 'Alocado' || pedido.status === 'Retirada')) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDispatch(pedido);
                                setSelectedDriverId(motoristas.length > 0 ? motoristas[0].id : "");
                              }}
                              className="text-[10px] text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 font-bold border border-amber-200 rounded px-1.5 py-0.5 whitespace-nowrap"
                            >
                              + Vincular
                            </button>
                          );
                        }

                        return pedido.updated_by || 'Administrador';
                      })()}
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={(e) => togglePagamento(e, pedido.id, !!pedido.pago)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          pedido.pago 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {pedido.pago ? (
                          <ThumbsUp className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ThumbsDown className="h-3 w-3 text-red-600" />
                        )}
                        {pedido.pago ? 'Pago' : 'Pendente'}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pedido.status === 'Pendente' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 h-7 text-xs px-2"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (motoristas.length > 0 && !pedido.motorista_id) {
                                setOrderToDispatch(pedido);
                                setSelectedDriverId(motoristas.length > 0 ? motoristas[0].id : "");
                              } else {
                                moverPedido(pedido.id, 'Alocado'); 
                              }
                              setInteractedOrders(prev => new Set(prev).add(pedido.id));
                            }}
                          >
                            {motoristas.length > 0 && !pedido.motorista_id ? 'Enviar p/ Motorista' : 'Marcar Alocado'}
                          </Button>
                        )}
                        {pedido.status === 'Alocado' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 h-7 text-xs px-2"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              moverPedido(pedido.id, 'Retirada', undefined, true); 
                              setInteractedOrders(prev => new Set(prev).add(pedido.id));
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Solicitar Troca
                          </Button>
                        )}
                        {pedido.status === 'Retirada' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 h-7 text-xs px-2"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setOrderToTroca(pedido); 
                              setTrocaDataRetirada(""); 
                              setInteractedOrders(prev => new Set(prev).add(pedido.id));
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Troca realizada
                          </Button>
                        )}
                        {(pedido.status === 'Alocado' || pedido.status === 'Atrasado') && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 h-7 text-xs px-2"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              moverPedido(pedido.id, 'Finalizado'); 
                              setInteractedOrders(prev => new Set(prev).add(pedido.id));
                            }}
                          >
                            Concluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {selectedOrder && (
          <EditOrderModal
            order={selectedOrder}
            open={!!selectedOrder}
            setOpen={(open) => !open && setSelectedOrder(null)}
            onSuccess={() => fetchPedidos(true)}
            onDelete={() => {
              setOrderToDelete(selectedOrder);
              setSelectedOrder(null);
            }}
          />
        )}
      </div>

      {/* Modal de Troca Realizada */}
      <Dialog open={!!orderToTroca} onOpenChange={(open) => !open && setOrderToTroca(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Troca realizada com sucesso</DialogTitle>
            <DialogDescription>
              Quando será a retirada do novo equipamento?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data da Troca (Locação)</Label>
              <Input 
                type="date" 
                value={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} 
                disabled 
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Retirada (Opcional)</Label>
              <Input 
                type="date" 
                value={trocaDataRetirada} 
                onChange={(e) => setTrocaDataRetirada(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderToTroca(null)}>Cancelar</Button>
            <Button onClick={handleSaveTroca}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pop-up (Dialog) de Confirmação de Exclusão */}
      <Dialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Excluir Pedido</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o pedido de <strong className="text-slate-900">{orderToDelete?.cliente_nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setOrderToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => orderToDelete && excluirPedido(orderToDelete.id)}
            >
              Sim, Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up (Dialog) para Escolha de Motorista */}
      <Dialog open={!!orderToDispatch} onOpenChange={(open) => !open && setOrderToDispatch(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Selecionar Motorista</DialogTitle>
            <DialogDescription>
              Selecione o motorista responsável pelo percurso para <strong className="text-slate-900">{orderToDispatch?.cliente_nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="driverSelect">Motorista</Label>
              <select
                id="driverSelect"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full border-slate-200 border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#19302a]"
              >
                {motoristas.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOrderToDispatch(null)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-[#19302a] hover:bg-[#12231e] text-white rounded-xl" 
              onClick={() => {
                if (orderToDispatch && selectedDriverId) {
                  // Apenas vincula o motorista, não muda o status para Alocado imediatamente
                  // O próprio motorista mudará o status para Alocado quando concluir a entrega no app
                  vincularMotorista(orderToDispatch.id, selectedDriverId);
                  setOrderToDispatch(null);
                }
              }}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

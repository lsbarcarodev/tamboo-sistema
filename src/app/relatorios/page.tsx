"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  DollarSign,
  Clock,
  Truck,
  TrendingUp,
  Activity,
  Award,
  Calendar,
  PieChart as PieChartIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";

type Periodo = 'mes_atual' | 'ultimos_30' | 'ultimos_15' | 'esta_semana';

export default function RelatoriosPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && user?.ocultar_relatorios) {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  const [loading, setLoading] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<Periodo>('mes_atual');
  const [todosPedidos, setTodosPedidos] = useState<any[]>([]);
  const [equipamentosStatus, setEquipamentosStatus] = useState({ total: 0, alocados: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Busca Equipamentos (Apenas para Taxa de Ocupação Atual)
      const { data: equipamentos } = await supabase.from('st_equipamentos').select('status');
      const totalEquipamentos = equipamentos?.length || 0;
      const alocados = equipamentos?.filter(e => e.status === 'Alocado').length || 0;
      setEquipamentosStatus({ total: totalEquipamentos, alocados });

      // Busca todos os pedidos para processamento em memória
      const { data: pedidos, error } = await supabase
        .from('st_locacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodosPedidos(pedidos || []);
    } catch (err: any) {
      console.error("Erro ao buscar dados:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtro de Dados baseado no Período
  const pedidosFiltrados = useMemo(() => {
    const now = new Date();
    return todosPedidos.filter(pedido => {
      if (!pedido.data_locacao) return false;
      const dLoc = new Date(pedido.data_locacao);
      
      switch (periodoSelecionado) {
        case 'mes_atual':
          return dLoc.getMonth() === now.getMonth() && dLoc.getFullYear() === now.getFullYear();
        case 'ultimos_30':
          const trintaDiasAtras = new Date();
          trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
          return dLoc >= trintaDiasAtras;
        case 'ultimos_15':
          const quinzeDiasAtras = new Date();
          quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);
          return dLoc >= quinzeDiasAtras;
        case 'esta_semana':
          const inicioSemana = new Date();
          inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay()); // Sunday
          inicioSemana.setHours(0,0,0,0);
          return dLoc >= inicioSemana;
        default:
          return true;
      }
    });
  }, [todosPedidos, periodoSelecionado]);

  // Processamento das Métricas
  const metricas = useMemo(() => {
    let faturamentoTotal = 0;
    let faturamentoRecebido = 0;
    let faturamentoPendente = 0;
    let countLocacoes = 0;
    let receitaCacamba = 0;
    let receitaTambor = 0;

    pedidosFiltrados.forEach(pedido => {
      const valor = Number(pedido.valor_locacao) || 0;
      faturamentoTotal += valor;
      countLocacoes++;

      if (pedido.pago) faturamentoRecebido += valor;
      else faturamentoPendente += valor;

      if (pedido.equipamento === 'Caçamba') receitaCacamba += valor;
      else if (pedido.equipamento === 'Tambores') receitaTambor += valor;
      else receitaCacamba += valor; // Fallback
    });
    const ticketMedio = countLocacoes > 0 ? (faturamentoTotal / countLocacoes) : 0;

    let atrasadas = 0;
    let ativas = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    pedidosFiltrados.forEach(pedido => {
      if (['Alocado', 'Pendente', 'Atrasado', 'Retirada'].includes(pedido.status)) {
        ativas++;
      }
      
      let isAtrasado = false;
      if (pedido.status === 'Pendente' && pedido.data_locacao) {
        if (new Date(pedido.data_locacao + "T00:00:00") < today) isAtrasado = true;
      }
      if (pedido.status === 'Alocado' && pedido.data_retirada) {
        if (new Date(pedido.data_retirada + "T00:00:00") < today) isAtrasado = true;
      }
      if (pedido.status === 'Atrasado' || isAtrasado) {
        atrasadas++;
      }
    });

    const taxaOcupacao = equipamentosStatus.total > 0 ? Math.min(100, Math.round((ativas / equipamentosStatus.total) * 100)) : 0;

    return {
      faturamentoTotal,
      faturamentoRecebido,
      faturamentoPendente,
      ticketMedio,
      taxaOcupacao,
      alocados: equipamentosStatus.alocados,
      totalEquipamentos: equipamentosStatus.total,
      atrasadas,
      ativas,
      mix: [
        { name: 'Caçambas', value: receitaCacamba, color: '#10b981' },
        { name: 'Tambores', value: receitaTambor, color: '#3b82f6' }
      ]
    };
  }, [pedidosFiltrados, todosPedidos, equipamentosStatus]);

  // Ranking de Clientes (Filtro Aplicado)
  const topClientes = useMemo(() => {
    const clientesMap: Record<string, { nome: string, total: number, pedidos: number }> = {};
    pedidosFiltrados.forEach(pedido => {
      if (!pedido.cliente_nome) return;
      if (!clientesMap[pedido.cliente_nome]) {
        clientesMap[pedido.cliente_nome] = { nome: pedido.cliente_nome, total: 0, pedidos: 0 };
      }
      clientesMap[pedido.cliente_nome].total += Number(pedido.valor_locacao) || 0;
      clientesMap[pedido.cliente_nome].pedidos += 1;
    });

    return Object.values(clientesMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [pedidosFiltrados]);

  // Gráfico de Movimentação (Últimos 14 dias fixos para não deformar o gráfico)
  const graficoMovimentacao = useMemo(() => {
    const chartDataMap: Record<string, { date: string, entregas: number, retiradas: number }> = {};
    const now = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      chartDataMap[label] = { date: label, entregas: 0, retiradas: 0 };
    }

    todosPedidos.forEach(pedido => {
      if (pedido.data_locacao && (pedido.tipo === 'Colocação' || pedido.tipo === 'Troca')) {
        const dLoc = new Date(pedido.data_locacao);
        const label = `${dLoc.getDate().toString().padStart(2, '0')}/${(dLoc.getMonth() + 1).toString().padStart(2, '0')}`;
        if (chartDataMap[label]) chartDataMap[label].entregas += 1;
      }
      
      if (pedido.data_retirada && pedido.status === 'Finalizado') {
         const dRet = new Date(pedido.data_retirada);
         const label = `${dRet.getDate().toString().padStart(2, '0')}/${(dRet.getMonth() + 1).toString().padStart(2, '0')}`;
         if (chartDataMap[label]) chartDataMap[label].retiradas += 1;
      }
    });

    return Object.values(chartDataMap);
  }, [todosPedidos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getPeriodoLabel = () => {
    switch(periodoSelecionado) {
      case 'mes_atual': return 'Este Mês';
      case 'ultimos_30': return 'Últimos 30 dias';
      case 'ultimos_15': return 'Últimos 15 dias';
      case 'esta_semana': return 'Esta Semana';
      default: return '';
    }
  };
  const periodoLabel = getPeriodoLabel();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios & Inteligência</h1>
          <p className="text-slate-500 mt-1">Acompanhe os principais indicadores (KPIs) operacionais e financeiros da sua locadora.</p>
        </div>
        
        {/* Filtro de Período Global */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm self-start">
          <Calendar className="h-4 w-4 text-slate-400 ml-2" />
          <select 
            className="text-sm font-medium bg-transparent border-none focus:ring-0 text-slate-700 py-1.5 pl-1 pr-6 cursor-pointer outline-none"
            value={periodoSelecionado}
            onChange={(e) => setPeriodoSelecionado(e.target.value as Periodo)}
          >
            <option value="mes_atual">Este Mês</option>
            <option value="ultimos_30">Últimos 30 dias</option>
            <option value="ultimos_15">Últimos 15 dias</option>
            <option value="esta_semana">Esta Semana</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500 animate-pulse font-medium">Analisando base de dados...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
          {/* Métricas Superiores */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="border-emerald-100 shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold text-emerald-800">Faturamento ({periodoLabel})</CardTitle>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(metricas.faturamentoTotal)}</div>
                <div className="flex justify-between items-center mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-500">Recebido: <span className="font-semibold text-emerald-700">{formatCurrency(metricas.faturamentoRecebido)}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-slate-500">Pendente: <span className="font-semibold text-amber-700">{formatCurrency(metricas.faturamentoPendente)}</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">Ticket Médio</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(metricas.ticketMedio)}</div>
                <p className="text-xs text-slate-500 mt-2">
                  Valor médio por locação no período
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">Taxa de Ocupação ({periodoLabel})</CardTitle>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{metricas.taxaOcupacao}%</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${metricas.taxaOcupacao}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {metricas.ativas} de {metricas.totalEquipamentos} locações no período
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">Locações Ativas ({periodoLabel})</CardTitle>
                <div className="p-2 bg-sky-50 rounded-lg text-sky-500">
                  <Truck className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{metricas.ativas}</div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Operações em andamento
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-100 shadow-sm bg-red-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-red-700">Atenção (Atrasos)</CardTitle>
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metricas.atrasadas}</div>
                <p className="text-xs text-red-600/70 mt-2 font-medium">
                  Locações com prazo vencido
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-8">
            {/* Gráfico Barras */}
            <Card className="lg:col-span-5 shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Volume Operacional (Últimos 14 dias)</CardTitle>
                <CardDescription>
                  Comparativo de entregas e retiradas diárias.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={graficoMovimentacao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      <Bar dataKey="entregas" name="Entregas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="retiradas" name="Retiradas" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* Gráfico Donut - Mix de Receita */}
              <Card className="shadow-sm border-slate-200 flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-slate-500" />
                    Mix de Receita (Por Equipamento)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[140px] w-full flex items-center justify-center">
                    {metricas.faturamentoTotal === 0 ? (
                      <p className="text-xs text-slate-400">Sem faturamento no período</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={metricas.mix}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {metricas.mix.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => formatCurrency(Number(value))}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {metricas.mix.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                        {item.name}: <span className="font-semibold">{metricas.faturamentoTotal > 0 ? Math.round((item.value / metricas.faturamentoTotal) * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking */}
              <Card className="shadow-sm border-slate-200 flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Top 5 Clientes do Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mt-2">
                    {topClientes.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Nenhum dado disponível.</p>
                    ) : (
                      topClientes.map((cliente, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                              index === 0 ? 'bg-amber-100 text-amber-700' :
                              index === 1 ? 'bg-slate-200 text-slate-700' :
                              index === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px] sm:max-w-[140px]">{cliente.nome}</span>
                              <span className="text-[10px] text-slate-500">{cliente.pedidos} locações</span>
                            </div>
                          </div>
                          <div className="font-semibold text-xs text-emerald-700">
                            {formatCurrency(cliente.total)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

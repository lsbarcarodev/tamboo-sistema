'use client';

import { useEffect, useState, useMemo } from "react";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  ThumbsUp, 
  ThumbsDown, 
  Calendar, 
  MessageSquare, 
  Search, 
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";

// Lista de meses do ano
const MESES = [
  { valor: 0, nome: "Janeiro" },
  { valor: 1, nome: "Fevereiro" },
  { valor: 2, nome: "Março" },
  { valor: 3, nome: "Abril" },
  { valor: 4, nome: "Maio" },
  { valor: 5, nome: "Junho" },
  { valor: 6, nome: "Julho" },
  { valor: 7, nome: "Agosto" },
  { valor: 8, nome: "Setembro" },
  { valor: 9, nome: "Outubro" },
  { valor: 10, nome: "Novembro" },
  { valor: 11, nome: "Dezembro" }
];

export default function FinanceiroPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [locacoes, setLocacoes] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<'geral' | 'pagos' | 'pendentes'>('geral');
  const [busca, setBusca] = useState('');
  
  // Define o mês atual como padrão
  const dataAtual = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(dataAtual.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(dataAtual.getFullYear());

  useEffect(() => {
    if (!userLoading && user?.ocultar_financeiro) {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Busca locações trazendo dados do cliente (incluindo o telefone)
      const { data, error } = await supabase
        .from('st_locacoes')
        .select(`
          *,
          st_clientes (
            telefone
          )
        `)
        .order('data_locacao', { ascending: false });

      if (error) throw error;
      setLocacoes(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar dados do financeiro:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Ouvir alterações em tempo real nas locações
    const channel = supabase
      .channel('financeiro_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'st_locacoes' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Alternar o status de pagamento
  const togglePagamento = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('st_locacoes')
        .update({ pago: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza o estado localmente para feedback instantâneo
      setLocacoes(prev => 
        prev.map(item => item.id === id ? { ...item, pago: !currentStatus } : item)
      );
    } catch (err: any) {
      console.error("Erro ao atualizar pagamento:", err.message);
      alert("Não foi possível atualizar o status de pagamento.");
    }
  };

  // Função para limpar o telefone para link do WhatsApp
  const limparTelefone = (tel: string) => {
    if (!tel) return "";
    const numeros = tel.replace(/\D/g, "");
    // Se não tiver o DDI do Brasil (55), adiciona
    if (numeros.length === 10 || numeros.length === 11) {
      return `55${numeros}`;
    }
    return numeros;
  };

  // Enviar mensagem de cobrança
  const cobrarCliente = (item: any) => {
    const telefone = item.st_clientes?.telefone;
    if (!telefone) {
      alert("Este cliente não possui telefone cadastrado!");
      return;
    }

    const telFormatado = limparTelefone(telefone);
    let dataFormatada = "";
    if (item.data_locacao) {
      const parts = item.data_locacao.split('-');
      if (parts.length === 3) {
        dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const valorFormatado = item.valor_locacao 
      ? Number(item.valor_locacao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : "R$ 0,00";

    const mensagem = encodeURIComponent(
      `Olá, *${item.cliente_nome}*!\n\nPassando para lembrar sobre a locação de *${item.equipamento}* realizada no dia *${dataFormatada}* no valor de *${valorFormatado}*.\n\nQualquer dúvida sobre a forma de pagamento, por favor, entre em contato por aqui. Obrigado! 🙏`
    );

    window.open(`https://wa.me/${telFormatado}?text=${mensagem}`, '_blank');
  };

  // 1. Filtrar apenas pelo Mês e Ano selecionados
  const locacoesDoMes = useMemo(() => {
    return locacoes.filter(item => {
      if (!item.data_locacao) return false;
      const parts = item.data_locacao.split('-');
      if (parts.length < 2) return false;
      const itemAno = parseInt(parts[0], 10);
      const itemMes = parseInt(parts[1], 10) - 1; // 0-indexed
      
      return itemMes === mesSelecionado && itemAno === anoSelecionado;
    });
  }, [locacoes, mesSelecionado, anoSelecionado]);

  // 2. Filtrar ainda mais pelos filtros de Status e Busca por texto
  const locacoesFiltradas = useMemo(() => {
    return locacoesDoMes.filter(item => {
      // Filtro de Status de Pagamento
      if (filtroStatus === 'pagos' && !item.pago) return false;
      if (filtroStatus === 'pendentes' && item.pago) return false;

      // Filtro de Busca por Texto
      if (busca.trim()) {
        const query = busca.toLowerCase();
        const nomeCliente = item.cliente_nome.toLowerCase();
        const endereco = item.endereco_entrega.toLowerCase();
        const equipamento = item.equipamento.toLowerCase();
        return nomeCliente.includes(query) || endereco.includes(query) || equipamento.includes(query);
      }

      return true;
    });
  }, [locacoesDoMes, filtroStatus, busca]);

  // 3. Cálculos de Resumo Financeiro (Sem sofrer alteração com filtros de status ou busca)
  const resumo = useMemo(() => {
    let total = 0;
    let recebido = 0;
    let pendente = 0;

    locacoesDoMes.forEach(item => {
      const valor = Number(item.valor_locacao) || 0;
      total += valor;
      if (item.pago) {
        recebido += valor;
      } else {
        pendente += valor;
      }
    });

    return { total, recebido, pendente };
  }, [locacoesDoMes]);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#19302a] tracking-tight">Financeiro</h1>
          <p className="text-slate-500 mt-1">Gerencie pagamentos, pendências e cobranças dos clientes.</p>
        </div>

        {/* Seleção de Mês e Ano */}
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[#19302a]" />
          <select 
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(Number(e.target.value))}
            className="border-slate-200 border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#19302a]"
          >
            {MESES.map(m => (
              <option key={m.valor} value={m.valor}>{m.nome}</option>
            ))}
          </select>

          <select 
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            className="border-slate-200 border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#19302a]"
          >
            <option value={dataAtual.getFullYear()}>{dataAtual.getFullYear()}</option>
            <option value={dataAtual.getFullYear() - 1}>{dataAtual.getFullYear() - 1}</option>
            <option value={dataAtual.getFullYear() - 2}>{dataAtual.getFullYear() - 2}</option>
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-l-4 border-slate-400">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">Valor Geral (Mês)</span>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {resumo.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-emerald-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">Recebido / Pago</span>
              <ThumbsUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">
              {resumo.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-rose-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-500">Pendente / Atrás</span>
              <ThumbsDown className="h-5 w-5 text-rose-500" />
            </div>
            <div className="mt-2 text-3xl font-bold text-rose-600">
              {resumo.pendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border">
        
        {/* Segment Controller (Geral, Pagos, Pendentes) */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl gap-1 w-full md:w-auto">
          <button
            onClick={() => setFiltroStatus('geral')}
            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              filtroStatus === 'geral' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Geral
          </button>
          
          <button
            onClick={() => setFiltroStatus('pagos')}
            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              filtroStatus === 'pagos' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-emerald-600'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            Pagos
          </button>

          <button
            onClick={() => setFiltroStatus('pendentes')}
            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              filtroStatus === 'pendentes' 
                ? 'bg-rose-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-rose-600'
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
            Pendentes
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, endereço..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 rounded-xl border-slate-200"
          />
        </div>
      </div>

      {/* Lista de Pedidos/Locações */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#19302a] mb-2" />
          <p className="text-slate-500">Buscando dados financeiros...</p>
        </div>
      ) : locacoesFiltradas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border shadow-sm flex flex-col items-center justify-center">
          <DollarSign className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Nenhuma movimentação encontrada</h3>
          <p className="text-slate-400 mt-1 max-w-sm">Não há locações ou status correspondentes para o mês e filtros selecionados.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {locacoesFiltradas.map((item) => (
            <div 
              key={item.id}
              className="py-3 flex items-center justify-between gap-4 transition-all hover:bg-slate-100/50 px-2 rounded-lg"
            >
              {/* Nome do Cliente com status dot */}
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.pago ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-sm font-semibold text-slate-800">{item.cliente_nome}</span>
              </div>

              {/* Valor + Ações */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                  {item.valor_locacao 
                    ? Number(item.valor_locacao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : "R$ 0,00"}
                </span>

                <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                  {/* Botão WhatsApp de Cobrança */}
                  {!item.pago && (
                    <Button 
                      onClick={() => cobrarCliente(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg h-8 px-3 text-xs gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Cobrar
                    </Button>
                  )}

                  {/* Botão de Toggle de Pagamento */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePagamento(item.id, !!item.pago)}
                    className={`h-8 w-8 rounded-lg ${
                      item.pago 
                        ? 'text-rose-600 hover:bg-rose-50' 
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={item.pago ? "Marcar como Pendente" : "Marcar como Pago"}
                  >
                    {item.pago ? <XCircle className="h-4.5 w-4.5" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

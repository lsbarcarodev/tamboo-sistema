"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, Truck, Clock, Loader2 } from "lucide-react";

const MapComponent = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 flex items-center justify-center animate-pulse rounded-lg">Carregando mapa...</div>
});

// Geocodificar um endereço usando API proxy local (evita CORS)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length < 3) return null;
  
  // Limpa o endereço para o padrão que o Nominatim entende (troca - e / por vírgulas)
  const cleanAddr = address.replace(/[-/]/g, ', ');
  
  const attemptGeocode = async (query: string) => {
    try {
      await new Promise(r => setTimeout(r, 1100)); // Rate limit 1s
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates;
        // GeoJSON coordinates are [longitude, latitude]
        return { lat: parseFloat(coords[1]), lng: parseFloat(coords[0]) };
      }
    } catch(e) {
      console.error(e);
    }
    return null;
  };

  // 1. Tenta o endereço completo limpo
  let result = await attemptGeocode(`${cleanAddr}, Brasil`);
  if (result) return result;
  
  // Extrair partes assumindo o padrão: Rua, Numero - Bairro - Cidade / UF
  const hyphenParts = address.split('-');
  if (hyphenParts.length > 1) {
    const streetPart = hyphenParts[0].trim(); // "Rua Niterói, 53"
    const cityStatePart = hyphenParts[hyphenParts.length - 1].trim().replace('/', ', '); // "Jundiaí, SP"
    
    // 2. Tenta Rua + Número + Cidade + Estado
    result = await attemptGeocode(`${streetPart}, ${cityStatePart}, Brasil`);
    if (result) return result;
    
    // 3. Tenta apenas Rua + Cidade + Estado (sem o número, pois as vezes o OSM não tem o número exato mapeado)
    const streetNameOnly = streetPart.split(',')[0].trim(); // "Rua Niterói"
    result = await attemptGeocode(`${streetNameOnly}, ${cityStatePart}, Brasil`);
    if (result) return result;
    
    // 4. Último caso: tenta apenas o CEP ou a Cidade (para não ficar sem pino)
    // Extrai a cidade removendo a sigla do estado se tiver
    const cityOnly = cityStatePart.split(',')[0].trim();
    result = await attemptGeocode(`${cityOnly}, Brasil`);
    if (result) {
       // Adiciona um pequeno ruído (jitter) se cair apenas no centro da cidade para não sobrepor pinos
       return { 
         lat: result.lat + (Math.random() - 0.5) * 0.005, 
         lng: result.lng + (Math.random() - 0.5) * 0.005 
       };
    }
  }

  return null;
}

export default function MapaPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [geocodingStatus, setGeocodingStatus] = useState<string>("");
  const [geocodingProgress, setGeocodingProgress] = useState({ done: 0, total: 0 });
  const [failedAddresses, setFailedAddresses] = useState<string[]>([]);
  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && user?.ocultar_mapa) {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('st_locacoes')
        .select('*')
        .neq('status', 'Concluído')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const locais = data || [];
      setPedidos(locais);

      // Background lazy geocoding for missing coordinates
      const missingCoords = locais.filter(loc => (!loc.lat || !loc.lng) && loc.endereco_entrega);
      if (missingCoords.length > 0) {
        setGeocodingStatus("Buscando localizações...");
        setGeocodingProgress({ done: 0, total: missingCoords.length });

        (async () => {
          let done = 0;
          for (const loc of missingCoords) {
            // Respect Nominatim rate limit (1 req/sec)
            await new Promise(r => setTimeout(r, 1200));
            
            setGeocodingStatus(`Localizando: ${loc.cliente_nome}...`);
            
            const coords = await geocodeAddress(loc.endereco_entrega);
            
            if (coords) {
              // Save to database
              await supabase.from('st_locacoes').update({ lat: coords.lat, lng: coords.lng }).eq('id', loc.id);
              // Update state so map refreshes
              setPedidos(prev => prev.map(p => p.id === loc.id ? { ...p, lat: coords.lat, lng: coords.lng } : p));
            } else {
              console.warn(`Não encontrou coordenadas para: "${loc.endereco_entrega}" (${loc.cliente_nome})`);
              setFailedAddresses(prev => [...prev, `${loc.cliente_nome}: ${loc.endereco_entrega}`]);
            }
            
            done++;
            setGeocodingProgress({ done, total: missingCoords.length });
          }
          setGeocodingStatus("");
        })();
      }
    } catch (error) {
      console.error("Erro ao carregar locações:", error);
    }
  };

  const getMapStatus = (p: any) => {
    let status = p.status;
    let isRetiradaDay = false;
    
    if (status === 'Alocado' && p.data_retirada) {
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const todayLocal = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
      const retDate = p.data_retirada.split('T')[0];
      if (todayLocal > retDate) status = 'Atrasado';
      if (todayLocal >= retDate) isRetiradaDay = true;
    }

    if (status === 'Atrasado') return 'Atrasadas';
    if (p.tipo === 'Retirada' || (status === 'Alocado' && isRetiradaDay && p.tipo === 'Colocação') || status === 'Retirada') return 'Retiradas';
    if (status === 'Alocado' && p.tipo === 'Colocação') return 'Alocadas';
    if (status === 'Pendente') return 'Aguardando Despacho';
    
    return 'Outros';
  };

  const aguardandoDespachoCount = pedidos.filter(p => getMapStatus(p) === 'Aguardando Despacho').length;
  const alocadasCount = pedidos.filter(p => getMapStatus(p) === 'Alocadas').length;
  const retiradasCount = pedidos.filter(p => getMapStatus(p) === 'Retiradas').length;
  const atrasadasCount = pedidos.filter(p => getMapStatus(p) === 'Atrasadas').length;

  const locacoesFiltradas = filtroAtivo 
    ? pedidos.filter(p => getMapStatus(p) === filtroAtivo) 
    : pedidos;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      <div className="pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mapa de Operação</h1>
              <p className="text-slate-500 mt-1">Visualize a localização de todas as suas caçambas em tempo real.</p>
            </div>
            <div className="flex items-center gap-4">
              {geocodingStatus && (
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-2 rounded-lg border shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  <span>{geocodingStatus} ({geocodingProgress.done}/{geocodingProgress.total})</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Alocada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Retirada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Atrasada</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Retirada</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card 
              className={`cursor-pointer transition-all ${filtroAtivo === 'Aguardando Despacho' ? 'ring-2 ring-amber-500 shadow-md' : 'hover:bg-slate-50 opacity-80 hover:opacity-100'}`}
              onClick={() => setFiltroAtivo(filtroAtivo === 'Aguardando Despacho' ? null : 'Aguardando Despacho')}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-amber-100 p-3 rounded-full">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Aguardando Despacho</p>
                  <p className="text-2xl font-bold text-slate-900">{aguardandoDespachoCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${filtroAtivo === 'Alocadas' ? 'ring-2 ring-emerald-500 shadow-md' : 'hover:bg-slate-50 opacity-80 hover:opacity-100'}`}
              onClick={() => setFiltroAtivo(filtroAtivo === 'Alocadas' ? null : 'Alocadas')}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-emerald-100 p-3 rounded-full">
                  <Truck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Alocadas</p>
                  <p className="text-2xl font-bold text-slate-900">{alocadasCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${filtroAtivo === 'Retiradas' ? 'ring-2 ring-yellow-500 shadow-md' : 'hover:bg-slate-50 opacity-80 hover:opacity-100'}`}
              onClick={() => setFiltroAtivo(filtroAtivo === 'Retiradas' ? null : 'Retiradas')}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Package className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Retiradas</p>
                  <p className="text-2xl font-bold text-slate-900">{retiradasCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {failedAddresses.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold mb-2">Não foi possível localizar os seguintes endereços no mapa:</h3>
              <ul className="list-disc pl-5 text-sm text-red-700 max-h-32 overflow-y-auto">
                {failedAddresses.map((addr, i) => (
                  <li key={i}>{addr}</li>
                ))}
              </ul>
              <p className="text-xs text-red-600 mt-2">Dica: Certifique-se de que o endereço contém rua, número, cidade e estado separados por hífen.</p>
            </div>
          )}
        </div>

        <div className="flex-1 pt-0">
          <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm relative z-0">
            <MapComponent locacoes={locacoesFiltradas} />
          </div>
        </div>
    </div>
  );
}

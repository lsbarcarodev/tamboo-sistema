"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";

// Fix missing default icons in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const createCustomIcon = (color: string) => {
  return new L.DivIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const icons = {
  emerald: createCustomIcon("#10b981"), // Alocado (verde)
  red: createCustomIcon("#ef4444"),     // Atrasado (vermelho)
  amber: createCustomIcon("#f59e0b"),   // Retirada (amarelo)
  yellow: createCustomIcon("#eab308"),  // Retirada
  blue: createCustomIcon("#3b82f6"),    // Pendente
};

// Component to auto-fit bounds when markers change
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions, map]);
  
  return null;
}

export default function Map({ locacoes }: { locacoes: any[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-slate-100 flex items-center justify-center animate-pulse rounded-lg">Carregando mapa...</div>;

  const validLocacoes = locacoes.filter(loc => loc.lat && loc.lng);
  
  const defaultCenter: [number, number] = validLocacoes.length > 0 
    ? [validLocacoes[0].lat, validLocacoes[0].lng] 
    : [-23.5505, -46.6333];

  const markerPositions: [number, number][] = validLocacoes.map(loc => [loc.lat, loc.lng]);

  const getIconForStatus = (status: string, dataRetirada: string, tipo: string) => {
    let displayStatus = status;
    let isRetiradaDay = false;

    if (status === 'Alocado' && dataRetirada) {
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const todayLocal = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
      const retDate = dataRetirada.split('T')[0];
      
      if (todayLocal > retDate) {
        displayStatus = 'Atrasado';
      }
      if (todayLocal >= retDate) {
        isRetiradaDay = true;
      }
    }

    // Atrasadas: em vermelho
    if (displayStatus === 'Atrasado') return icons.red; 
    
    // Retirada: Em amarelo
    if (tipo === 'Retirada' || (displayStatus === 'Alocado' && isRetiradaDay && tipo === 'Colocação')) {
       return icons.amber; 
    }
    
    // Alocadas: em verde
    if (displayStatus === 'Alocado' && tipo === 'Colocação') {
      return icons.emerald;
    }

    // Retirada
    if (displayStatus === 'Retirada') return icons.yellow;
    
    // Pendentes
    return icons.blue;
  };

  const getStatusLabel = (status: string, dataRetirada: string, tipo: string) => {
    let displayStatus = status;
    if (status === 'Alocado' && dataRetirada) {
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const todayLocal = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
      const retDate = dataRetirada.split('T')[0];
      if (todayLocal > retDate) displayStatus = 'Atrasado';
    }
    return displayStatus;
  };

  const getOperacaoLabel = (tipo: string) => {
    if (tipo === 'Colocação') return 'Locação';
    return tipo;
  };

  return (
    <MapContainer center={defaultCenter} zoom={12} style={{ height: "100%", width: "100%", zIndex: 0 }} className="rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={markerPositions} />
      {validLocacoes.map((loc) => (
        <Marker 
          key={loc.id} 
          position={[loc.lat, loc.lng]}
          icon={getIconForStatus(loc.status, loc.data_retirada, loc.tipo)}
        >
          <Popup>
            <div className="flex flex-col gap-2 min-w-[220px]">
              <div className="font-bold text-base">{loc.cliente_nome}</div>
              <div className="text-sm text-slate-600">{loc.endereco_entrega}</div>
              <div className="flex flex-col gap-1 mt-1 border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Equipamento:</span>
                  <span className="text-xs font-medium">{loc.equipamento}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Status:</span>
                  <span className="text-xs font-semibold">{getStatusLabel(loc.status, loc.data_retirada, loc.tipo)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Operação:</span>
                  <span className="text-xs font-semibold">{getOperacaoLabel(loc.tipo)}</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

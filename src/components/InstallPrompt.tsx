"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";
import { Button } from "./ui/button";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidNativePrompt, setShowAndroidNativePrompt] = useState(false);
  const [showAndroidManualPrompt, setShowAndroidManualPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return; // Já instalado
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    // Se o usuário já viu o aviso antes, não mostra de novo
    const dismissed = localStorage.getItem('tamboo_install_dismissed_v2');
    if (dismissed === 'true') {
      return;
    }

    // Já marca como visto para que nas próximas visitas/reloads não apareça mais
    localStorage.setItem('tamboo_install_dismissed_v2', 'true');

    // Android/Chrome event listener (para PWA nativo)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidNativePrompt(true);
      setShowAndroidManualPrompt(false); // se o nativo funcionar, esconde o manual
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Mostra banners manuais (fallback)
    if (isIos) {
      setShowIosPrompt(true);
    } else if (isAndroid) {
      // Dá um tempo pro beforeinstallprompt disparar. Se não disparar (ex: ambiente HTTP local), mostra o manual.
      const timer = setTimeout(() => {
        if (!deferredPrompt) {
          setShowAndroidManualPrompt(true);
        }
      }, 1500);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidNativePrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowAndroidNativePrompt(false);
    setShowAndroidManualPrompt(false);
    setShowIosPrompt(false);
    localStorage.setItem('tamboo_install_dismissed_v2', 'true');
  };

  if (showAndroidNativePrompt) {
    return (
      <div className="fixed bottom-0 left-0 w-full bg-white p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-[100] border-t border-slate-200 animate-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <h4 className="font-bold text-slate-800 text-sm">Instalar Aplicativo</h4>
              <p className="text-xs text-slate-500">Tenha acesso rápido direto do seu celular</p>
           </div>
           <div className="flex gap-2 items-center">
             <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-8 w-8 text-slate-400">
               <X className="w-4 h-4" />
             </Button>
             <Button onClick={handleInstallClick} className="bg-[#EE4D2D] hover:bg-[#D74022] text-white h-8 text-xs font-bold px-4 rounded-full">
               <Download className="w-3.5 h-3.5 mr-1" />
               Instalar
             </Button>
           </div>
        </div>
      </div>
    );
  }

  if (showAndroidManualPrompt) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] bg-white p-4 shadow-xl z-[100] border border-slate-200 rounded-xl animate-in slide-in-from-bottom-5">
        <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600">
           <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center text-center gap-2 mt-2">
           <div className="bg-slate-100 p-2 rounded-full mb-1 flex items-center justify-center">
             <MoreVertical className="w-5 h-5 text-slate-600" />
           </div>
           <h4 className="font-bold text-slate-800 text-sm">Instalar Aplicativo</h4>
           <p className="text-xs text-slate-600 mb-1 leading-relaxed">
             Para instalar no Android, toque nos <strong>três pontinhos</strong> no canto superior direito do seu navegador e escolha <strong>Adicionar à tela inicial</strong> ou <strong>Instalar aplicativo</strong>.
           </p>
        </div>
      </div>
    );
  }

  if (showIosPrompt) {
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] bg-white p-4 shadow-xl z-[100] border border-slate-200 rounded-xl animate-in slide-in-from-bottom-5">
        <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600">
           <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center text-center gap-2 mt-2">
           <div className="bg-slate-100 p-2 rounded-full mb-1 flex items-center justify-center">
             <Share className="w-5 h-5 text-blue-500" />
           </div>
           <h4 className="font-bold text-slate-800 text-sm">Instalar no iPhone</h4>
           <p className="text-xs text-slate-600 mb-1 leading-relaxed">
             Toque no ícone de <strong>Compartilhar</strong> na barra inferior e selecione <strong>Adicionar à Tela de Início</strong>.
           </p>
        </div>
      </div>
    );
  }

  return null;
}
